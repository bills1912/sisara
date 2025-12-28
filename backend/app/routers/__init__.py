from app.routers.budget_router import router as budget_router
from app.routers.master_data_router import router as master_data_router
from app.routers.theme_router import router as theme_router
from app.routers.revision_router import router as revision_router
from app.routers.auth_router import router as auth_router
from app.routers.system_router import router as system_router

__all__ = ["budget_router", "master_data_router", "theme_router", "revision_router", "auth_router", "system_router"]
