// const { writeFile, readFile } = require('fs');
const { writeFile, readFile } = require('fs').promises;

// writeFile('./text.txt', 'node is great', err => {
//   if (err) throw err;
//   readFile('./text.txt', 'utf8', (err, text) => {
//     if (err) throw err;
//     console.log(`Text after modification: ${text}`);
//   });
// });

// Retrieve → Edit → Save
// readFile('./text.txt', 'utf8')
//   .then(text => {
//     let newText = text + ' and JavaScript is great.';
//     writeFile('./text.txt', newText).then(() => console.log('Data has been succesfully edited'));
//   })
//   .catch(console.log);

async function retrieveJSON(path) {
  let data = await readFile(path, 'utf-8');
  return JSON.parse(data);
}

retrieveJSON('data.json').then(console.log);
