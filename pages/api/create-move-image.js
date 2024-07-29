import AWS from 'aws-sdk';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageData } = req.body;

  if (!imageData) {
    return res.status(400).json({ error: 'Image data is required' });
  }

  const spacesEndpoint = new AWS.Endpoint(process.env.DO_SPACES_ENDPOINT);
  const s3 = new AWS.S3({
    endpoint: spacesEndpoint,
    accessKeyId: process.env.DO_SPACES_KEY,
    secretAccessKey: process.env.DO_SPACES_SECRET
  });

  const buf = Buffer.from(imageData.replace(/^data:image\/\w+;base64,/, ""), 'base64');
  const params = {
    Bucket: process.env.DO_SPACES_BUCKET,
    Key: `chess-move-${Date.now()}.png`,
    Body: buf,
    ContentEncoding: 'base64',
    ContentType: 'image/png',
    ACL: 'public-read'
  };

  try {
    const data = await new Promise((resolve, reject) => {
      s3.upload(params, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });

    res.status(200).json({ url: data.Location });
  } catch (error) {
    console.error('Error uploading to DigitalOcean:', error);
    res.status(500).json({ error: 'Error uploading image' });
  }
}