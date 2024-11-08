const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');

// Initialize the S3 client
const s3 = new S3Client({
    region: 'nyc3',
    credentials: {
        accessKeyId: process.env.DO_SPACES_KEY,
        secretAccessKey: process.env.DO_SPACES_SECRET,
    },
    endpoint: 'https://nyc3.digitaloceanspaces.com', // Changed endpoint
    forcePathStyle: false,
    signatureVersion: 'v4'
});

// Optional: Add error handling for configuration
process.on('unhandledRejection', error => {
    console.error('S3 Client Error:', error);
});

const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: 'hungrx',
        acl: 'public-read',
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: function (req, file, cb) {
            // Add error handling for file type validation
            if (!file.mimetype.startsWith('image/')) {
                return cb(new Error('Only image files are allowed!'));
            }
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, `restaurants/${uniqueSuffix}-${file.originalname}`);
        }
    }),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

module.exports = upload;