# 🚀 Pulse CRM — AI-Native Marketing Operating System

**Pulse CRM** is an AI-native shopper engagement platform that transforms customer data into autonomous, personalized marketing workflows. Instead of manually segmenting customers and creating campaigns, marketers simply define business goals in natural language while AI orchestrates the entire customer engagement lifecycle.

> **"Pulse CRM transforms customer data into autonomous, AI-driven engagement at scale."**

---

## 🌐 Live Demo

🔗 https://pulse-crm-eta.vercel.app

---

## 🎥 Walkthrough Video

A detailed walkthrough video demonstrating all features, architecture, and AI workflows is included in the submission.

> **Note:** The assignment suggested a 5–6 minute video. I created a slightly longer walkthrough (~10 minutes) to comprehensively explain all implemented features, architectural decisions, and AI-native workflows.

---

## 🎯 Problem Statement

Retail businesses collect customer data from purchases, website visits, and campaigns, but often struggle to answer:

* Who should I target?
* What message should I send?
* Which channel will maximize conversion?

Pulse CRM solves these challenges using AI-powered customer intelligence, segmentation, campaign orchestration, and real-time analytics.

---

# ✨ Core Features

## 👥 Shopper Management

* Customer Profiles
* Purchase History
* Last Visit Tracking
* Total Spend
* Preferred Categories
* Customer Lifetime Value (LTV)

---

## 🧠 AI-Powered Customer Segmentation

Automatically classifies shoppers into:

* High-Value Customers
* Frequent Buyers
* At-Risk Customers
* New Customers
* Dormant Customers

---

## 🤖 AI Insights & Recommendations

Generate insights such as:

* Likely to purchase within 7 days
* Customer inactive for 60+ days
* Discount campaign recommendation
* Next Best Action suggestions

---

## 📢 Personalized Outreach

AI generates personalized:

* Email Campaigns
* SMS Messages
* WhatsApp Messages
* RCS Campaigns

Example:

> *"Hi Sarah, we noticed you loved our skincare products. Enjoy 15% off on our latest collection."*

---

## 📈 Campaign Dashboard

Track:

* Messages Sent
* Delivery Rate
* Open Rate
* Click Rate
* Conversion Rate
* Revenue Attribution

---

## 🔄 Multi-Channel Communication Lifecycle

Track the complete message lifecycle:

```text
SENT
↓
DELIVERED
↓
OPENED
↓
CLICKED
↓
CONVERTED
```

---

## 🎯 Audience Studio

Natural-language audience creation:

> "Dormant skincare customers in Mumbai with spend greater than ₹5000."

AI automatically converts prompts into customer cohorts.

---

## 🤖 AI Copilot & Pulse Assistant

Ask business questions such as:

* Who are my top customers?
* Which campaign generated the most revenue?
* Which customers are likely to churn?

Pulse Assistant also answers technical questions regarding architecture and workflows.

---

## 📡 Live Telemetry Pipeline

Visualizes real-time event flow across:

* Campaign Processing
* Delivery Events
* Webhook Updates
* Analytics Computation

---

## 🏗️ Architecture Overview

Pulse CRM follows an **AI-native, cloud-native, event-driven architecture**.

### System Flow

```text
Business Goal
      ↓
AI Agent Orchestrator
      ↓
Customer Analysis
      ↓
Audience Generation
      ↓
Message Generation
      ↓
Channel Selection
      ↓
Campaign Execution
      ↓
Channel Service
      ↓
Webhook Events
      ↓
Analytics Engine
      ↓
Next Best Action
```

---

## ⚙️ Tech Stack

| Layer            | Technology                         |
| ---------------- | ---------------------------------- |
| Frontend         | Next.js 15, React 19, Tailwind CSS |
| State Management | React Query                        |
| Backend          | Node.js                            |
| Database         | Neon PostgreSQL                    |
| ORM              | Prisma                             |
| AI Layer         | OpenAI / Gemini                    |
| Queue            | BullMQ                             |
| Cache            | Upstash Redis                      |
| Deployment       | Vercel                             |
| Messaging        | Channel Simulator                  |

---

## 📁 Repository Structure

```text
frontend/
├── app/
├── components/
├── hooks/
├── lib/
└── API Routes (BFF)

backend/
├── database/
├── ai-engine/
├── analytics/
├── channel-service/
└── shared/
```

---

## 🚀 Quick Start

### Backend Setup

```bash
cd backend
npm install
npm run db:push
npm run db:seed
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Optional Channel Service

```bash
cd backend
npm run dev:channel
```

### Windows One-Click Start

```powershell
.\backend\scripts\start-xenopilot.ps1
```

---

## 🔄 Event-Driven Workflow

```text
Campaign Created
      ↓
BullMQ Queue
      ↓
Background Worker
      ↓
Channel Service
      ↓
Webhook Callback
      ↓
Database Update
      ↓
Analytics Update
      ↓
Dashboard Refresh
```

---

## 💻 AI-Native Development Workflow

AI was used throughout both development and product functionality.

Development tools included:

* Cursor
* LLM-assisted prototyping
* AI-assisted debugging
* Architecture generation

All generated code was manually reviewed, integrated, and validated.

---

## 📌 Assignment Deliverables

✅ Hosted Working Product

✅ Public GitHub Repository

✅ AI-Native CRM

✅ Multi-Channel Campaigns

✅ AI Segmentation

✅ Personalized Messaging

✅ Channel Service

✅ Webhooks

✅ Analytics Dashboard

✅ AI Copilot

---

## 🙏 A Note to Reviewers

This project was built not only to satisfy the assignment requirements but also to explore how AI can become the operating layer of modern CRM systems.

I encourage reviewers to explore the application end-to-end, as several features are interactive and distributed across different modules including Mission Control, Customer Intelligence, Audience Studio, Campaign War Room, Analytics, and AI Copilot.

Thank you for taking the time to review **Pulse CRM**.

— **Dheventh SJ**
