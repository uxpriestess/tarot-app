const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'assets/cards/majorArcana');

function readPngDimensions(filePath) {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(24);
    fs.readSync(fd, buffer, 0, 24, 0);
    fs.closeSync(fd);

    // Check PNG signature
    if (buffer.toString('hex', 0, 8) !== '89504e470d0a1a0a') {
        return null;
    }

    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);

    return { width, height };
}

try {
    const files = fs.readdirSync(directoryPath);
    let output = '';

    for (const file of files) {
        if (path.extname(file).toLowerCase() === '.png') {
            const filePath = path.join(directoryPath, file);
            try {
                const dims = readPngDimensions(filePath);
                if (dims) {
                    output += `IMAGE:${file}:${dims.width}:${dims.height}\n`;
                } else {
                    output += `ERROR:${file}:Invalid PNG signature\n`;
                }
            } catch (e) {
                output += `ERROR:${file}:${e.message}\n`;
            }
        }
    }
    fs.writeFileSync('image_dims.txt', output);
    console.log('Done writing dimensions.');
} catch (err) {
    console.log('Unable to scan directory: ' + err);
}
