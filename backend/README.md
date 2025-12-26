# SISARA Backend API

Backend API untuk Sistem Perencanaan Anggaran (SISARA) - Budget Planning and Revision System.

## Tech Stack

- **FastAPI** - Modern Python web framework
- **MongoDB** - NoSQL database (MongoDB Atlas)
- **Motor** - Async MongoDB driver
- **Pydantic** - Data validation

## Quick Start (Local Development)

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Set environment variables (or create .env file)
export MONGODB_URL="mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority"
export DATABASE_NAME="budget_system"

# 3. Run migration to seed initial data
python migrate_sync.py

# 4. Start server
uvicorn app.main:app --reload --port 8000
```

## Deploy to Render

### Step 1: Push to GitHub

```bash
# Initialize git repository
git init
git add .
git commit -m "Initial commit"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/sisara-backend.git
git branch -M main
git push -u origin main
```

### Step 2: Create Render Web Service

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure the service:

| Setting | Value |
|---------|-------|
| **Name** | `sisara-api` |
| **Region** | Singapore (or nearest) |
| **Branch** | `main` |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |

### Step 3: Set Environment Variables

In Render dashboard, go to **Environment** tab and add:

| Key | Value |
|-----|-------|
| `MONGODB_URL` | `mongodb+srv://ricardozalukhu1925:kuran1925@cluster0.lhmox.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0` |
| `DATABASE_NAME` | `budget_system` |

### Step 4: Deploy

Click **"Create Web Service"** - Render will automatically deploy your API.

Your API will be available at: `https://sisara-api.onrender.com`

### Step 5: Run Migration (One-time)

After deployment, run migration to seed initial data. You can do this locally:

```bash
# Set the same MONGODB_URL
export MONGODB_URL="mongodb+srv://..."
python migrate_sync.py
```

Or use Render Shell (in dashboard → Shell tab):
```bash
python migrate_sync.py
```

## API Endpoints

Base URL: `https://your-app.onrender.com`

### Health Check
- `GET /` - API info
- `GET /health` - Health status
- `GET /docs` - Swagger UI
- `GET /redoc` - ReDoc

### Budget Rows
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/budget/` | Get all budget rows (tree) |
| GET | `/api/budget/{id}` | Get single row |
| POST | `/api/budget/` | Create row |
| POST | `/api/budget/{id}/children` | Add child row |
| PUT | `/api/budget/{id}` | Update row |
| DELETE | `/api/budget/{id}` | Delete row + children |
| POST | `/api/budget/{id}/copy` | Duplicate row |
| PUT | `/api/budget/{id}/monthly/{month}` | Update monthly data |

### Master Data
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/master-data/` | Get all master data |
| GET | `/api/master-data/{type}` | Get by type |
| POST | `/api/master-data/` | Create item |
| POST | `/api/master-data/bulk` | Bulk create |
| DELETE | `/api/master-data/{type}/{code}` | Delete item |

### Theme
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/theme/` | Get theme config |
| PUT | `/api/theme/` | Update theme |
| POST | `/api/theme/reset` | Reset to default |

## Frontend Integration

Update your React frontend to use the Render API URL:

```typescript
// src/config.ts or .env
const API_BASE_URL = "https://sisara-api.onrender.com";

// Example fetch
const response = await fetch(`${API_BASE_URL}/api/budget/`);
const data = await response.json();
```

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py           # FastAPI app
│   ├── config.py         # Settings
│   ├── database.py       # MongoDB connection
│   ├── models/
│   │   └── schemas.py    # Pydantic models
│   ├── routers/
│   │   ├── budget_router.py
│   │   ├── master_data_router.py
│   │   └── theme_router.py
│   └── services/
│       ├── budget_service.py
│       ├── master_data_service.py
│       └── theme_service.py
├── migrate_sync.py       # Database migration
├── requirements.txt
├── runtime.txt           # Python version
├── Procfile              # Render start command
├── render.yaml           # Render config
└── README.md
```

## Troubleshooting

### MongoDB Connection Error
- Verify `MONGODB_URL` is correct
- Check MongoDB Atlas Network Access (allow `0.0.0.0/0` for Render)
- Ensure database user has correct permissions

### Render Build Fails
- Check `requirements.txt` has all dependencies
- Verify Python version in `runtime.txt`

### CORS Error
- API already allows all origins (`*`)
- If issues persist, check browser console for specific errors

