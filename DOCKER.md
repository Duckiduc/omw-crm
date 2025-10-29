# OMW CRM - Docker Setup

This project includes Docker Compose configurations for both development and production environments.

## Quick Start

### Development Environment (with hot reload)

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up --build

# Or run in detached mode
docker-compose -f docker-compose.dev.yml up -d --build
```

**Development URLs:**

- Frontend: http://localhost:5173
- Backend API: http://localhost:3002
- Database: localhost:5432

### Production Environment

```bash
# Start production environment
docker-compose up --build -d

# Or specify the production file explicitly
docker-compose -f docker-compose.yml up --build -d
```

**Production URLs:**

- Frontend: http://localhost:3000
- Backend API: http://localhost:3002
- Database: localhost:5432

## Services

### Database (PostgreSQL)

- **Image:** postgres:15-alpine
- **Port:** 5432
- **Database:** omw_crm
- **User:** postgres
- **Password:** postgres

### Backend (Node.js/Express)

- **Development Port:** 3002
- **Production Port:** 3002
- **Health Check:** http://localhost:3002/api/health

### Frontend (React/Vite)

- **Development Port:** 5173
- **Production Port:** 3000 (served by Nginx)

## Environment Variables

The Docker setup uses the following default environment variables:

### Backend

- `NODE_ENV`: development/production
- `PORT`: 3002
- `DB_HOST`: db (container name)
- `DB_PORT`: 5432
- `DB_NAME`: omw_crm
- `DB_USER`: postgres
- `DB_PASSWORD`: postgres
- `JWT_SECRET`: Auto-generated (change in production)
- `FRONTEND_URL`: Frontend URL for CORS

### Frontend

- `VITE_API_URL`: Backend API URL

## Database Setup

### Initial Setup

The database will be automatically initialized when the containers start. The application will create all necessary tables through its migration system and will create a default admin user.

**Default Admin Credentials:**

- Email: `admin@omwcrm.local`
- Password: `password`
- ⚠️ **Important**: Please change this password after first login!

The default admin user is created automatically during the first migration. You can use these credentials to login and access the Admin Panel to manage system settings and users.

### Manual Database Operations

```bash
# Access the database container
docker-compose exec db psql -U postgres -d omw_crm

# Run database migrations manually (if needed)
docker-compose exec backend npm run migrate

# Run all migrations
docker-compose exec backend npm run migrate:all

# Create default admin user (if not already created)
docker-compose exec backend npm run create-admin
```

## Development Workflow

### Starting Development Environment

```bash
# Clone the repository
git clone <repository-url>
cd omw-crm

# Start development containers
docker-compose -f docker-compose.dev.yml up --build
```

### Making Changes

- **Frontend changes**: Automatically reloaded via Vite
- **Backend changes**: Automatically restarted via nodemon
- **Package changes**: Rebuild containers with `--build` flag

### Logs

```bash
# View all logs
docker-compose -f docker-compose.dev.yml logs -f

# View specific service logs
docker-compose -f docker-compose.dev.yml logs -f backend
docker-compose -f docker-compose.dev.yml logs -f frontend
docker-compose -f docker-compose.dev.yml logs -f db
```

## Production Deployment

### Build and Deploy

```bash
# Build and start production containers
docker-compose up --build -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Health Checks

All services include health checks:

- **Database**: PostgreSQL connection check
- **Backend**: HTTP health endpoint
- **Frontend**: Nginx server check

### Monitoring

```bash
# Check container health
docker-compose ps

# View resource usage
docker stats

# Access container shells
docker-compose exec backend sh
docker-compose exec frontend sh
docker-compose exec db sh
```

## Data Persistence

### Volumes

- **Development**: `postgres_data_dev` - Development database data
- **Production**: `postgres_data` - Production database data

### Backup Database

```bash
# Create database backup
docker-compose exec db pg_dump -U postgres omw_crm > backup.sql

# Restore database
docker-compose exec -T db psql -U postgres omw_crm < backup.sql
```

## Troubleshooting

### Common Issues

1. **Port conflicts**: Change port mappings in docker-compose files
2. **Permission issues**: Ensure proper file permissions
3. **Database connection**: Check if db service is healthy
4. **Build failures**: Clear Docker cache and rebuild

### Useful Commands

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ deletes data)
docker-compose down -v

# Rebuild specific service
docker-compose build backend

# View service logs
docker-compose logs backend

# Execute commands in containers
docker-compose exec backend npm run migrate
docker-compose exec db psql -U postgres omw_crm
```

### Reset Everything

```bash
# Stop containers and remove volumes (⚠️ deletes all data)
docker-compose down -v

# Remove all containers and images
docker system prune -a

# Rebuild from scratch
docker-compose up --build
```

## Security Notes

### Development

- Default passwords are used for convenience
- CORS is configured for localhost
- Debug modes are enabled

### Production

⚠️ **Important**: Before deploying to production:

1. **Change default passwords**:

   - Database password
   - JWT secret

2. **Update environment variables**:

   - Set proper `FRONTEND_URL`
   - Configure secure `JWT_SECRET`
   - Set `NODE_ENV=production`

3. **Configure networking**:

   - Use proper domain names
   - Enable HTTPS
   - Configure reverse proxy if needed

4. **Enable monitoring**:
   - Set up log aggregation
   - Configure health checks
   - Monitor resource usage

## Performance Optimization

### Production Optimizations

- **Frontend**: Multi-stage build with Nginx
- **Backend**: Production-only dependencies
- **Database**: Persistent volumes with optimized settings
- **Caching**: Nginx static file caching enabled

### Scaling

To scale services:

```bash
# Scale backend to 3 instances
docker-compose up --scale backend=3

# Use load balancer for multiple instances
```

## Support

For issues or questions:

1. Check logs: `docker-compose logs -f [service]`
2. Verify health checks: `docker-compose ps`
3. Check network connectivity between services
4. Review environment variable configuration
