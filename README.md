# AI-Powered Content Moderation Microservice

A production-ready content moderation microservice that uses AI to detect and flag inappropriate content. This project follows a modern full-stack architecture with PostgreSQL, Express, React, and Node.js (PERN).

## Features

- 🛡️ AI-powered content moderation using Google Cloud NLP
- 👥 User authentication with Clerk
- 📝 Post, comment, and review functionality
- 📧 Email notifications for flagged content
- 👮 Admin dashboard for managing flagged content
- 🔄 Role-based access control (RBAC)
- 🚀 Scalable architecture with queue-based processing
- 🐳 Containerized with Docker and Kubernetes
- 🌙 Light/dark mode support
- 📱 Responsive design for all devices

## Tech Stack

### Backend
- **Express.js**: Backend framework
- **Prisma**: ORM for database operations
- **PostgreSQL**: Database (via Supabase)
- **BullMQ + Redis**: Queue processing for scalability
- **Google Cloud NLP**: AI text moderation
- **Nodemailer**: Email notifications
- **Clerk**: Authentication service
- **Swagger/OpenAPI**: API documentation

### Frontend
- **React**: UI framework
- **TailwindCSS**: Utility-first CSS framework
- **Shadcn UI**: UI component library
- **React Query**: Data fetching and caching
- **React Router**: Client-side routing
- **Clerk React**: Authentication UI components
- **Axios**: HTTP client

### DevOps
- **Docker**: Containerization
- **Kubernetes**: Container orchestration (Minikube for local dev)
- **GitHub Actions**: CI/CD pipeline
- **Sentry**: Error monitoring

## Project Structure

```
moderation-microservice/
├── .github/workflows/         # GitHub Actions CI/CD
├── backend/                   # Express backend
│   ├── prisma/                # Prisma schema and migrations
│   ├── src/                   # Backend source code
│   └── Dockerfile             # Backend Docker config
├── frontend/                  # React frontend
│   ├── public/                # Static assets
│   ├── src/                   # Frontend source code
│   └── Dockerfile             # Frontend Docker config
├── kubernetes/                # Kubernetes manifests
├── docker-compose.yml         # Docker Compose for local dev
└── README.md                  # Project documentation
```

## Prerequisites

- [Node.js](https://nodejs.org/) (v16 or newer)
- [pnpm](https://pnpm.io/) (v7 or newer)
- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/)
- [Minikube](https://minikube.sigs.k8s.io/) (for local Kubernetes development)
- [Google Cloud Platform](https://cloud.google.com/) account (for NLP API)
- [Supabase](https://supabase.com/) account (for PostgreSQL)
- [Clerk](https://clerk.dev/) account (for authentication)

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/sanskarpan/moderation-microservice.git
cd moderation-microservice
```

### 2. Setup environment variables

Create `.env` files for both backend and frontend. Refer to .env.sample in both sub-directories.


### 3. Setup services

#### Supabase (PostgreSQL)

1. Create a [Supabase](https://supabase.com/) account and project
2. Get the PostgreSQL connection string from the project settings
3. Update the `DATABASE_URL` in the backend `.env` file

#### Google Cloud Platform

1. Create a GCP account and project
2. Enable the "Cloud Natural Language API"
3. Create a service account with "Cloud Natural Language API User" role
4. Download the JSON key file and save it as `gcp-credentials.json` in the backend folder

#### Clerk Authentication

1. Create a [Clerk](https://clerk.dev/) account
2. Create a new application
3. Copy the API keys from your Clerk dashboard
4. Update the `.env` files with your Clerk API keys

### 4. Install dependencies

```bash
# Install pnpm globally if not already installed
npm install -g pnpm

# Install dependencies for backend
cd backend
pnpm install

# Generate Prisma client
pnpm prisma generate

# Install dependencies for frontend
cd ../frontend
pnpm install
```

### 5. Run the development servers

#### Using Docker Compose 

```bash
# From the root directory
docker-compose up
```

#### Manually (for separate development)

```bash
# Terminal 1: Start the backend server
cd backend
pnpm run dev

# Terminal 2: Start the frontend server
cd frontend
pnpm start

# Terminal 3: Start Redis locally
docker run -p 6379:6379 redis:alpine
```

### 6. Access the application

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- API Documentation: http://localhost:5000/api/docs

## Database Migration

To apply the Prisma schema to your database:

```bash
cd backend
pnpm prisma db push
```

To create a new migration:

```bash
cd backend
pnpm prisma migrate dev --name your_migration_name
```

## Deployment

### Docker

Build and push Docker images:

```bash
# Build and tag backend
docker build -t yourusername/moderation-backend:latest ./backend

# Build and tag frontend
docker build -t yourusername/moderation-frontend:latest ./frontend

# Push images
docker push yourusername/moderation-backend:latest
docker push yourusername/moderation-frontend:latest
```

### Kubernetes

1. Update Kubernetes manifest files with your specific configurations
2. Apply the manifests:

```bash
kubectl apply -f kubernetes/redis-deployment.yaml
kubectl apply -f kubernetes/backend-deployment.yaml
kubectl apply -f kubernetes/frontend-deployment.yaml
```

## Production Checklist

Before deploying to production, ensure:

- [ ] All environment variables are securely set
- [ ] API rate limiting is enabled
- [ ] CORS is properly configured
- [ ] Frontend build is optimized
- [ ] Database connections are secure
- [ ] SSL/TLS is enabled
- [ ] Error monitoring is set up (Sentry)
- [ ] Backups are configured
- [ ] CI/CD pipeline is working

## Development Guidelines

- Follow the commit message format: `type(scope): message` (e.g., `feat(auth): add JWT authentication`)
- Create branches for features and use pull requests for merging
- Run linters before committing: `pnpm lint`
- Keep the documentation up-to-date

## Project Phases

This project follows a phase-wise development approach:

1. **Phase 0**: Project scaffold & repository setup
2. **Phase 1**: Backend MVP (Express + Prisma + PostgreSQL)
3. **Phase 2**: Frontend MVP (ReactJS + Shadcn + TailwindCSS)
4. **Phase 3**: Email Notifications (Nodemailer)
5. **Phase 4**: Admin Role & RBAC
6. **Phase 5**: Scalability Infrastructure (BullMQ + Redis)
7. **Phase 6**: Kubernetes Migration
8. **Phase 7**: Ensemble Moderation (Adapter Layer)
9. **Final Phase**: Polishing, Testing, Delivery

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements

- [Express.js](https://expressjs.com/)
- [React](https://reactjs.org/)
- [Prisma](https://www.prisma.io/)
- [Supabase](https://supabase.com/)
- [TailwindCSS](https://tailwindcss.com/)
- [Shadcn UI](https://ui.shadcn.com/)
- [Google Cloud NLP](https://cloud.google.com/natural-language)
- [Clerk Authentication](https://clerk.dev/)
- [BullMQ](https://docs.bullmq.io/)
- [Kubernetes](https://kubernetes.io/)