# Kubernetes Deployment for Content Moderation Microservice

This directory contains Kubernetes manifest files for deploying the Content Moderation Microservice on Kubernetes.

## Prerequisites

- Kubernetes cluster (local or cloud-based)
- kubectl CLI tool installed and configured
- Docker registry for storing container images
- Container images for frontend and backend already built and pushed to the registry

## Overview

The application consists of several components deployed in Kubernetes:

1. **Frontend** - React web application
2. **Backend** - Express.js API service
3. **Redis** - Used for rate limiting, caching, and message queues
4. **ConfigMap** - Configuration for the application
5. **Secrets** - Sensitive values for the application
6. **Ingress** - Handles external traffic routing
7. **HPA** - Horizontal Pod Autoscaler for scaling pods based on metrics

## Setup Steps

### 1. Create a Namespace (Optional)

Create a dedicated namespace for the application:

```bash
kubectl create namespace content-moderation
```

### 2. Create ConfigMap and Secrets

Create the ConfigMap:

```bash
kubectl apply -f configmap.yaml
```

For the secrets, you need to create a secrets.yaml file with your actual secrets base64 encoded:

```bash
# Generate base64 encoded secrets (example for Linux/macOS)
echo -n 'your-database-url' | base64
echo -n 'your-clerk-secret-key' | base64
echo -n 'your-clerk-publishable-key' | base64
echo -n 'your-email-user' | base64
echo -n 'your-email-password' | base64
echo -n 'your-sentry-dsn' | base64
```

Then update the secrets.yaml file with the generated values and apply it:

```bash
kubectl apply -f secrets.yaml
```

### 3. Deploy Redis

```bash
kubectl apply -f redis-deployment.yaml
```

### 4. Deploy Backend

```bash
# Replace ${DOCKER_REGISTRY} with your actual registry in the YAML file
# Or use environment variable substitution
export DOCKER_REGISTRY=your-registry-url

# Apply the backend deployment
envsubst < backend-deployment.yaml | kubectl apply -f -
```

### 5. Deploy Frontend

```bash
# Apply the frontend deployment using environment variable substitution
envsubst < frontend-deployment.yaml | kubectl apply -f -
```

### 6. Configure Autoscaling

```bash
kubectl apply -f horizontal-pod-autoscaler.yaml
```

### 7. Create Ingress

Before applying the ingress, make sure to:
- Update the hostname in the ingress.yaml file
- Have a working ingress controller (like NGINX Ingress Controller)
- Set up cert-manager for TLS certificates (if using HTTPS)

```bash
kubectl apply -f ingress.yaml
```

## Verifying the Deployment

Check all resources in your namespace:

```bash
kubectl get all
```

Check pods status:

```bash
kubectl get pods

# For detailed logs from a specific pod
kubectl logs <pod-name>
```

Check services:

```bash
kubectl get svc
```

Check ingress status:

```bash
kubectl get ingress
```

## Minikube Local Development

For local development with Minikube:

1. Start Minikube:
   ```bash
   minikube start
   ```

2. Enable the NGINX Ingress controller:
   ```bash
   minikube addons enable ingress
   ```

3. Build and load images into Minikube:
   ```bash
   # For the frontend
   eval $(minikube docker-env)
   docker build -t content-moderation-frontend:latest ./frontend
   
   # For the backend
   docker build -t content-moderation-backend:latest ./backend
   ```

4. Update your deployment files to use the local images:
   ```yaml
   # In backend-deployment.yaml and frontend-deployment.yaml
   image: content-moderation-backend:latest
   imagePullPolicy: Never
   ```

5. Apply all the Kubernetes resources.

6. Add an entry to your hosts file for local DNS resolution:
   ```
   echo "$(minikube ip) content-moderation.local api.content-moderation.local" | sudo tee -a /etc/hosts
   ```

7. Access the application at `http://content-moderation.local`

## Cleaning Up

To remove all resources:

```bash
# If using a namespace
kubectl delete namespace content-moderation

# Or delete individual resources
kubectl delete -f .
```

## Troubleshooting

### Common Issues

1. **Pods not starting**:
   ```bash
   kubectl describe pod <pod-name>
   ```

2. **Services not connecting**:
   ```bash
   kubectl exec -it <pod-name> -- curl <service-name>:<port>
   ```

3. **Ingress not working**:
   ```bash
   kubectl describe ingress content-moderation-ingress
   ```

4. **Persistent volumes issues**:
   ```bash
   kubectl get pv,pvc
   kubectl describe pv <pv-name>
   ```

### Logs

To check logs for each component:

```bash
# Backend logs
kubectl logs -l app=content-moderation,tier=backend

# Frontend logs
kubectl logs -l app=content-moderation,tier=frontend

# Redis logs
kubectl logs -l app=content-moderation,tier=redis
```

## Next Steps

- Set up monitoring with Prometheus and Grafana
- Configure logging with ELK stack or similar
- Implement CI/CD pipeline for automated deployments
- Set up backup and restore for Redis data