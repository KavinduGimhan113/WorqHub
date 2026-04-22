# Use Local MongoDB (when Atlas IP whitelist fails)

If you keep getting "Could not connect to any servers" from MongoDB Atlas, use local MongoDB instead.

## Quick setup with Docker

```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

Then in `backend/.env`:

```
MONGO_URI=mongodb://localhost:27017/worqhub
```

Run seed:

```bash
cd backend
npm run seed
```

---

## Or fix Atlas

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) → your cluster
2. **Network Access** → **Add IP Address**
3. Enter **0.0.0.0/0** (Allow from anywhere)
4. Click **Confirm**
5. Wait 1–2 minutes, then run `npm run seed` again
