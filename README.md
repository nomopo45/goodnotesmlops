# Task

## For each pull request to the default branch, trigger the CI workflow. (for example with GitHub Actions)

Followed this doc to create a ci.yaml file https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax and trigger the CI workflow for PR to the main branch.

## Provision a multi-node (at least 2 nodes) Kubernetes cluster (you may use KinD to provision this cluster on the CI runner (localhost))

Used this doc : https://dev.to/i_am_vesh/multi-node-kubernetes-cluster-setup-with-kind-mih and AI for correct syntax.
Created a kind-config.yaml and deployed in ci.yaml

## Deploy Ingress controller to handle incoming HTTP requests
   
Used : https://kind.sigs.k8s.io/docs/user/ingress/
update .github/kind-config.yaml to include the necessary port mappings and update ci.yaml to deploy NGINX Ingress Controller
   
## Create 2 http-echo deployments, one serving a response of “bar” and another serving a response of “foo”.

Used https://kind.sigs.k8s.io/docs/user/ingress/#using-ingress and https://github.com/hashicorp/http-echo
Add k8s Deployment Service and Ingress for foo and bar web server. Update the ci.yaml by applying the different kubernetes file and adding test
   
## Configure cluster / ingress routing to send traffic for “bar” hostname to the bar deployment and “foo” hostname to the foo deployment on local cluster (i.e. route both http://foo.localhost and http://bar.localhost).

Change kubernetes Ingress and the test in the ci.yaml accordingly

## Generate a load of randomized traffic for bar and foo hosts and capture the load testing result. Post the output of the load testing result as comment on the GitHub Pull Request (automated the CI job). Depending on the report your load testing script generates, ideally 9. you'd post stats for http request duration (avg, p90, p95, ...), % of http request failed, req/s handled.

Choose k6 because of : https://docs.gitlab.com/ci/testing/load_performance_testing/
Then following doc + AI to do the load test and add PR comment.

# Overview

This project implements a production-ready CI/CD pipeline that:

1. **Provisions Infrastructure** - Multi-node Kubernetes cluster using KinD
2. **Deploys Services** - Two microservices with host-based routing
3. **Configures Ingress** - NGINX Ingress Controller for traffic management
4. **Performs Load Testing** - Automated performance testing with k6
5. **Reports Results** - Automated PR comments with test metrics

### Key Features

- ✅ **Multi-node Kubernetes cluster** (1 control-plane + 2 workers)
- ✅ **Host-based ingress routing** (foo.localhost, bar.localhost)
- ✅ **Automated load testing** with randomized traffic distribution
- ✅ **PR-integrated reporting** with performance metrics
- ✅ **Comprehensive validation** at every pipeline stage

---

## 🏗️ Architecture

```

┌─────────────────────────────────────────────────────────────┐
│                     GitHub Actions Runner                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           KinD Kubernetes Cluster (localhost)         │  │
│  │                                                        │  │
│  │  ┌──────────────┐                                     │  │
│  │  │ Control-Plane│  NGINX Ingress Controller          │  │
│  │  │    Node      │  (hostPort: 80)                │  │
│  │  └──────────────┘                                     │  │
│  │         │                                              │  │
│  │    ┌────┴────┐                                        │  │
│  │  ┌─▼─┐    ┌─▼─┐                                      │  │
│  │  │W1 │    │W2 │  Worker Nodes                        │  │
│  │  └───┘    └───┘                                       │  │
│  │    │        │                                         │  │
│  │  ┌─▼────┬───▼─┐                                      │  │
│  │  │ foo  │ bar │  Deployments (2 replicas each)      │  │
│  │  │ pods │ pods│  http-echo containers                │  │
│  │  └──────┴─────┘                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  k6 Load Tester                                       │  │
│  │  - Randomized traffic: foo.localhost / bar.localhost │  │
│  │  - 20 virtual users                                   │  │
│  │  - 2-minute duration                                  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
│
▼
┌─────────────────┐
│  Pull Request   │
│  with Results   │
└─────────────────┘

```

### Traffic Flow

```

User Request → NGINX Ingress (Port 80)
↓
[Host Header Check]
↓
┌────────┴────────┐
▼                 ▼
foo.localhost    bar.localhost
▼                 ▼
foo-service      bar-service
▼                 ▼
foo pods         bar pods
▼                 ▼
Response: "foo"  Response: "bar"

```

---

## 📦 Prerequisites

- **GitHub Repository** with Actions enabled
- **Git** installed locally
- **Basic knowledge** of Kubernetes, Docker, and CI/CD

### For Local Testing (Optional)

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [KinD](https://kind.sigs.k8s.io/docs/user/quick-start/)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- [k6](https://k6.io/docs/get-started/installation/)

---
