const { createWriteStream, createReadStream } = require('fs');

let readStream = createReadStream('./text.txt', 'utf-8');
readStream.on('data', chunk => console.log(`Data written: ${chunk}`));
readStream.on('end', () => console.log('Writing has ended'));

let textFile = createWriteStream('./text.txt', 'utf-8');
textFile.write('hot ');
textFile.write('hot ');
textFile.write('hot ');
textFile.end();
// textFile.end('headed');
