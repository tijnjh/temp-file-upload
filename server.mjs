import fs from "fs";
import express from "express";
import multer from "multer";
import path from "path";
import crypto from "node:crypto";

const __dirname = path.resolve();
const app = express();
app.use(express.static(path.join(__dirname, "public")));

const fileMap = new Map();
const algorithm = "aes-256-cbc";
const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);

function encrypt(buffer) {
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  return encrypted;
}

function decrypt(encrypted) {
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted;
}

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 1 * 1024 * 1024 * 1024 },
});

app.post("/", upload.single("f"), (req, res) => {
  if (!req.file) {
    return res.status(400).send("no file uploaded or file is too large.");
  }

  const randomId = Math.random().toString(36).slice(2);
  const extension = path.extname(req.file.originalname);
  const encryptedBuffer = encrypt(req.file.buffer);

  const uploadDir = "uploads/";
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
  }

  const filePath = path.join(uploadDir, `${randomId}${extension}`);
  fs.writeFileSync(filePath, encryptedBuffer);

  fileMap.set(randomId, req.file.originalname);

  setTimeout(() => {
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error(`failed to delete file ${filePath}:`, err);
      } else {
        console.log(`deleted file ${filePath} after 1 hour`);
      }
    });
    fileMap.delete(randomId);
  }, 3600000);

  const downloadLink = `${req.protocol}://${req.get("host")}/${randomId}`;
  res.send(downloadLink);
});

app.get("/:id", (req, res) => {
  const fileId = req.params.id;
  const directoryPath = path.join(__dirname, "uploads");
  const originalFilename = fileMap.get(fileId);

  if (originalFilename) {
    const filePath = path.join(
      directoryPath,
      `${fileId}${path.extname(originalFilename)}`
    );
    const encryptedBuffer = fs.readFileSync(filePath);
    const decryptedBuffer = decrypt(encryptedBuffer);

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${originalFilename}"`
    );
    res.setHeader("Content-Type", "application/octet-stream");
    res.send(decryptedBuffer);
  } else {
    res.status(404).send("file not found.");
  }
});

app.listen(3000, () => {
  console.log("server is running on port 3000");
});
