function handleAction(state, action) {
  if (action.type === 'setUser') {
    localStorage.setItem('userName', action.user);
    return Object.assign({}, state, { user: action.user });
  } else if (action.type === 'setTalks') {
    return Object.assign({}, state, { talks: action.talks });
  } else if (action.type === 'newTalk') {
    fetchOK(talkURL(action.title), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        presenter: state.user,
        summary: action.summary
      })
    }).catch(reportError);
  } else if (action.type === 'deleteTalk') {
    fetchOK(talkURL(action.talk), { method: 'DELETE' }).catch(reportError);
  } else if (action.type === 'newComment') {
    fetchOK(talkURL(action.talk) + '/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        author: state.user,
        message: action.message
      })
    }).catch(reportError);
  }
  return state;
}

function fetchOK(url, options) {
  return fetch(url, options).then(response => {
    if (response.status < 400) return response;
    else throw new Error(response.statusText);
  });
}

function talkURL(title) {
  return `/talks/${encodeURIComponent(title)}`;
}

function reportError(error) {
  alert(String(error));
}

/* ======================================================================================================== */

// RENDERING COMPONENTS

function elt(type, props, ...children) {
  let dom = document.createElement(type);
  if (props) Object.assign(dom, props);
  for (const child of children) {
    if (typeof child !== 'string') dom.appendChild(child);
    else dom.appendChild(document.createTextNode(child));
  }
  return dom;
}

// USER FIELD
function renderUserField(name, dispatch) {
  return elt(
    'label',
    {},
    elt('input', {
      type: 'text',
      value: name,
      onchange(event) {
        dispatch({ type: 'setUser', user: event.target.value });
      }
    })
  );
}

// TALK PAGE
function renderTalk(talk, dispatch) {
  return elt(
    'section',
    { className: 'talk' },
    elt(
      'h2',
      null,
      talk.title,
      ' ',
      elt(
        'button',
        {
          type: 'button',
          onclick: () => dispatch({ type: 'deleteTalk', talk: talk.title })
        },
        'Delete'
      )
    ),
    elt('div', null, 'by ', elt('strong', null, talk.presenter)),
    elt('p', null, talk.summary),
    ...talk.comments.map(renderComment),
    elt(
      'form',
      {
        onsubmit(event) {
          event.preventDefault();
          let form = event.target;
          dispatch({
            type: 'newComment',
            talk: talk.title,
            message: form.elements.comment.value
          });
          form.reset();
        }
      },
      elt('input', {
        type: 'text',
        name: 'comment',
        value: JSON.parse(localStorage.getItem(talk.title)),
        oninput(event) {
          localStorage.setItem(talk.title, JSON.stringify(event.target.value));
        }
      }),
      ' ',
      elt('button', { type: 'submit' }, 'Add Comment')
    )
  );
}

function renderComment({ author, message }) {
  return elt('p', { className: 'comment' }, elt('strong', null, author), ': ', message);
}

function renderTalkForm(dispatch) {
  let title = elt('input', { type: 'text' });
  let summary = elt('input', { type: 'text' });
  return elt(
    'form',
    {
      onsubmit(event) {
        event.preventDefault();
        dispatch({
          type: 'newTalk',
          title: title.value,
          summary: summary.value
        });
        event.target.reset();
      }
    },
    elt('h3', null, 'Submit a Talk'),
    elt('label', null, 'Title: ', title),
    elt('label', null, 'Summary: ', summary),
    elt('button', { type: 'submit' }, 'Submit')
  );
}

async function pollTalks(update) {
  // "tag" will hold client side data version.
  let tag;
  for (;;) {
    let response;
    try {
      response = await fetchOK('/talks', {
        headers: tag && {
          'If-None-Match': tag,
          Prefer: 'wait=90'
        }
      });
    } catch (err) {
      console.log(`Request failed: ${err}`);
      await new Promise(resolve => setTimeout(resolve, 500));
      continue;
    }
    if (response.status === 304) continue;
    tag = response.headers.get('ETag');
    // Update the client's state with parsed JSON data.
    update(await response.json());
  }
}

/* ======================================================================================================== */

class SkillShareApp {
  constructor(state, dispatch) {
    this.dispatch = dispatch;
    this.talkDOM = elt('div', { className: 'talks' });
    this.dom = elt(
      'div',
      null,
      renderUserField(state.user, dispatch),
      this.talkDOM,
      renderTalkForm(dispatch)
    );
    this.syncState(state);
  }

  syncState(state) {
    if (state.talks !== this.talks) {
      // Delete all the child elements without looping through them.
      this.talkDOM.textContent = '';
      for (const talk of state.talks) {
        this.talkDOM.appendChild(renderTalk(talk, this.dispatch));
      }
      this.talks = state.talks;
    }
  }
}

function runApp() {
  let user = localStorage.getItem('userName') || 'Anon';
  let state, app;
  function dispatch(action) {
    state = handleAction(state, action);
    app.syncState(state);
  }

  pollTalks(talks => {
    if (!app) {
      state = { user, talks };
      app = new SkillShareApp(state, dispatch);
      document.body.appendChild(app.dom);
    } else {
      dispatch({ type: 'setTalks', talks });
    }
  }).catch(reportError);
}

runApp();

/* ======================================================================================================== */

// EXERCISE

// COMMENT FIELD RESET
// → Whenever new data comes in, the app will redraw all its DOM elements.
// The problem occur when user is typing inputs on form, and if new data comes in, it will reset its value.

// SOLUTION
// → Saving to localStorage as the user types in using talk's title as its key to distinguish one talk ~
// ~ to the other. And setting comment field's value to what is lately stored into the storage.
// elt('input', {
//   type: 'text',
//   name: 'comment',
//   value: JSON.parse(localStorage.getItem(talk.title)),
//   oninput(event) {
//     localStorage.setItem(talk.title, JSON.stringify(event.target.value));
//   }
// });
