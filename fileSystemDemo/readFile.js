const { readFile } = require('fs').promises;

readFile('./data.json', 'utf8')
  .then(data => {
    let parsed = JSON.parse(data);
    for (const { title, summary, presenter } of parsed) {
      console.log(`Title: ${title}, summary: ${summary}, presenter: ${presenter}`);
    }
  })
  .catch(console.log);
