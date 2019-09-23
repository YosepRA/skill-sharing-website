const { createServer } = require('http');
const Router = require('./router');
const ecstatic = require('ecstatic');

const router = new Router();
const defaultHeader = { 'Content-Type': 'text/plain' };

class SkillShareServer {
  constructor(talks) {
    // "talks" will be an object with talk's title as its property name.
    this.talks = talks;
    this.version = 0;
    this.waiting = [];

    let fileServer = ecstatic({ root: './public' });
    this.server = createServer((request, response) => {
      let resolve = router.resolve(this, request);
      if (resolve) {
        resolve
          .catch(err => {
            if (err.status !== null) return err;
            return { status: 500, body: String(err) };
          })
          .then(({ body, status = 200, headers = defaultHeader }) => {
            response.writeHead(status, headers);
            response.end(body);
          });
      } else {
        fileServer(request, response);
      }
    });
  }

  start(port) {
    this.server.listen(port);
    console.log(`Server is listening at port ${port}`);
  }
  stop() {
    this.server.close();
  }
}

/* ======================================================================================================== */

// "/talks/[title]"
const talkPath = /^\/talks\/([^/]+)$/;

router.add('GET', talkPath, async (server, title) => {
  if (title in server.talks) {
    return {
      body: JSON.stringify(server.talks[title]),
      headers: { 'Content-Type': 'application/json' }
    };
  } else {
    return {
      status: 404,
      body: `No talk ${title} found`
    };
  }
});

router.add('DELETE', talkPath, async (server, title) => {
  if (title in server.talks) {
    delete server.talks[title];
    server.updated();
  }
  return { status: 204 };
});

// Passing it a readable stream and it will return a promise that will resolve to a string ~
// ~ data coming from the stream.
function readStream(stream) {
  return new Promise((resolve, reject) => {
    let data = '';
    stream.on('error', reject);
    stream.on('data', chunk => (data += chunk.toString()));
    stream.on('end', () => resolve(data));
  });
}

router.add('PUT', talkPath, async (server, title, request) => {
  // Getting the content of request body.
  let requestBody = await readStream(request);
  let talk;
  try {
    talk = JSON.parse(requestBody);
  } catch (_) {
    return { status: 400, body: 'Invalid JSON' };
  }
  if (!talk || typeof talk.presenter !== 'string' || typeof talk.summary !== 'string') {
    return { status: 400, body: 'Bad talk data' };
  }
  server.talks[title] = {
    title,
    presenter: talk.presenter,
    summary: talk.summary,
    comments: []
  };
  server.updated();
  return { status: 204 };
});

const commentPath = /^\/talks\/([^/]+)\/comments$/;

router.add('POST', commentPath, async (server, title, request) => {
  let requestBody = await readStream(request);
  let comment;
  try {
    comment = JSON.parse(requestBody);
  } catch (_) {
    return { status: 400, body: 'Invalid JSON' };
  }
  if (!comment || typeof comment.author !== 'string' || typeof comment.message !== 'string') {
    return { status: 400, body: 'Bad comment data' };
  } else if (title in server.talks) {
    server.talks[title].comments.push(comment);
    server.updated();
    return { status: 204 };
  } else {
    return { status: 404, body: `No talk ${title} found` };
  }
});

/* ======================================================================================================== */

// LONG POLLING MECHANISM

// "talkResponse" will handle the normal GET request to "/talks" and returns a JSON array of talks.
SkillShareServer.prototype.talkResponse = function() {
  let talks = Object.values(this.talks);
  // let talks = [];
  // console.log('talkResponse');
  // for (const title of this.talks) {
  //   talks.push(this.talks[title]);
  // }
  return {
    body: JSON.stringify(talks),
    headers: {
      'Content-Type': 'application/json',
      ETag: `${this.version}`
    }
  };
};

router.add('GET', /^\/talks$/, async (server, request) => {
  let tag = /(.*)/.exec(request.headers['if-none-match']);
  let wait = /\bwait=(\d+)/.exec(request.headers['prefer']);
  // If it's an initial request or it has a different version (asking for update).
  if (!tag || tag[1] != server.version) {
    return server.talkResponse();
  } else if (!wait) {
    // If it has the same version but it's asking for a direct request, return 304 (not modified).
    return { status: 304 };
  } else {
    // Else if it has the same version and it's a long polling request.
    return server.waitForChanges(Number(wait[1]));
  }
});

SkillShareServer.prototype.waitForChanges = function(time) {
  return new Promise(resolve => {
    this.waiting.push(resolve);
    setTimeout(() => {
      // If the prior request has been returned, cancel the timeout handler.
      if (!this.waiting.includes(resolve)) return;
      this.waiting = this.waiting.filter(r => r !== resolve);
      return { status: 304 };
    }, time * 1000);
  });
};

SkillShareServer.prototype.updated = function() {
  this.version++;
  let response = this.talkResponse();
  this.waiting.forEach(resolve => resolve(response));
  this.waiting = [];
};

/* ======================================================================================================== */

new SkillShareServer(Object.create(null)).start(8000);
