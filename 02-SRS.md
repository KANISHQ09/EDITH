# Software Requirements Specification (SRS)
## Voice AI Incident Commander (VAIC)

**Document Version:** 1.0.0
**IEEE Standard:** Based on IEEE 830-1998
**Date:** August 2026
**Classification:** Internal Engineering — Confidential

---

## Table of Contents

1. Introduction
2. Overall Description
3. User Roles
4. Functional Requirements
5. Non-Functional Requirements
6. Security Requirements
7. Performance Requirements
8. Database Requirements
9. API Requirements
10. Third-Party Integrations
11. External Interfaces
12. Error Handling & Logging
13. Monitoring
14. Backup & Recovery
15. Compliance
16. Testing Requirements
17. Deployment Requirements

---

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification defines the complete functional and non-functional requirements for the Voice AI Incident Commander (VAIC) system. This document serves as the authoritative reference for the design, development, testing, and deployment of VAIC.

### 1.2 Scope

VAIC is an AI-native, voice-aware incident management system that:

- Ingests live audio from virtual conference platforms
- Applies real-time speech-to-text and speaker diarization
- Uses large language model (LLM) inference to classify and extract incident intelligence
- Maintains a structured incident state object updated in real time
- Delivers spoken summaries and bidirectional tool integrations
- Generates post-incident summary artifacts

The system comprises: an Audio Ingestion Service, a Transcription & Diarization Engine, an NLP Classification Engine, an Incident State Store, a Dashboard Frontend, a Voice Synthesis Engine, a Tool Integration Gateway, and a Report Generation Service.

### 1.3 Definitions

| Term | Definition |
|---|---|
| ASR | Automatic Speech Recognition — converting audio to text |
| Diarization | Segmenting audio by speaker identity |
| IC | Incident Commander — the human leading incident response |
| ISR | Incident Summary Report — the structured post-incident artifact |
| VAIC | Voice AI Incident Commander — the system described in this SRS |
| Utterance | A single continuous speech segment by one speaker |
| Fact | Information confirmed by evidence, tool output, or consensus |
| Hypothesis | Proposed explanation; unconfirmed; requires investigation |
| Action Item | A specific task assigned to a named owner with implied urgency |
| WER | Word Error Rate — ASR accuracy metric (lower is better) |
| MTTR | Mean Time To Resolve |
| TTS | Text-to-Speech — converting text to synthesized audio |
| Confirmation Gate | A mandatory human approval step before VAIC executes a tool action |

### 1.4 References

- Anthropic Claude API Documentation
- OpenAI Whisper Large V3 Research Paper
- pyannote.audio Documentation
- Zoom Video SDK Documentation
- PagerDuty API v2 Reference
- Jira REST API v3 Reference
- Slack Web API Documentation
- IEEE 830-1998 SRS Standard
- GDPR Article 9 (Special Categories of Data)
- CCPA Sections 1798.100–1798.199

### 1.5 Overview

Section 2 provides system context. Sections 3–4 define users and functional behavior. Sections 5–9 define quality attributes and technical constraints. Sections 10–17 define integration, compliance, and operational requirements.

---

## 2. Overall Description

### 2.1 Product Perspective

VAIC operates as an independent SaaS service that integrates with existing enterprise toolchains via APIs and webhooks. It does not replace PagerDuty, Jira, or Slack — it orchestrates them during incident response. VAIC is deployed as containerized microservices in customer cloud environments.

### 2.2 Product Functions (Summary)

- Live audio capture from conference platforms
- Real-time transcription and speaker attribution
- LLM-based utterance classification and entity extraction
- Incident state management (timeline, facts, actions, decisions)
- Conflict and gap detection
- Voice synthesis and spoken delivery
- Tool integration with confirmation gates
- Post-incident report generation

### 2.3 Operating Environment

- **Runtime:** Kubernetes on AWS EKS / GCP GKE / Azure AKS
- **Supported Conference Platforms:** Zoom (MVP), Google Meet, Microsoft Teams (v1.5)
- **Browser Support for Dashboard:** Chrome 120+, Firefox 120+, Safari 17+, Edge 120+
- **Node.js Runtime:** ≥ 20 LTS
- **Python Runtime:** ≥ 3.11
- **Database:** PostgreSQL 15+ (primary), Redis 7+ (cache/pub-sub)
- **Message Queue:** Apache Kafka 3.5+

### 2.4 Design & Implementation Constraints

- Audio processing pipeline must complete classification within 3 seconds of utterance end
- All audio streams must be encrypted in transit (TLS 1.3) and at rest (AES-256)
- The system must be region-aware — audio data must not leave the customer's designated cloud region
- LLM inference must use Anthropic's claude-sonnet-4-6 for production classification
- No autonomous write operations to external tools without confirmation gate passage

---

## 3. User Roles

| Role | System Access | Permissions |
|---|---|---|
| **Incident Commander** | Dashboard + Voice | Full read/write on all incident data; confirm tool actions; close incident |
| **Responder** | Dashboard + Voice | Read all; edit own action items; add manual entries |
| **Observer** | Dashboard (read) | Read-only; no modification rights |
| **Business Stakeholder** | Summary Dashboard | View confirmed facts, timeline, business impact panel only |
| **VAIC System** | Internal | All read; write requires confirmation gate pass |
| **Platform Admin** | Admin Console | Configure integrations, user rosters, retention policies |

---

## 4. Functional Requirements

### 4.1 Audio Ingestion Service (AIS)

| ID | Requirement |
|---|---|
| AIS-01 | The system SHALL connect to Zoom as a bot participant using the Zoom Video SDK upon incident creation |
| AIS-02 | The system SHALL ingest raw PCM audio at 16kHz, 16-bit mono from all participant audio channels |
| AIS-03 | The system SHALL separate individual participant audio streams (channel splitting) for accurate diarization |
| AIS-04 | The system SHALL buffer audio in 500ms segments for streaming transcription |
| AIS-05 | The system SHALL support a minimum of 50 concurrent audio participants per incident |
| AIS-06 | The system SHALL detect and handle participant join/leave events in real time |
| AIS-07 | The system SHALL gracefully handle audio gaps, dropouts, and reconnections without service interruption |
| AIS-08 | The system SHALL publish raw audio segments to Kafka topic `audio.raw.{incident_id}` |

### 4.2 Transcription & Diarization Engine (TDE)

| ID | Requirement |
|---|---|
| TDE-01 | The system SHALL transcribe audio using OpenAI Whisper Large V3 with a target WER ≤5% for clear English speech |
| TDE-02 | The system SHALL perform speaker diarization using pyannote.audio to attribute each utterance to a speaker segment |
| TDE-03 | The system SHALL correlate diarization segments with conference platform participant metadata to assign names |
| TDE-04 | The system SHALL support dynamic speaker registration — new participants identified within 10 seconds of joining |
| TDE-05 | The system SHALL detect when participants self-identify their role ("I'm the IC for this call") and update role records |
| TDE-06 | The system SHALL produce a Transcript Entry for each utterance: `{speaker_id, speaker_name, role, text, start_ts, end_ts, confidence}` |
| TDE-07 | The system SHALL publish Transcript Entries to Kafka topic `transcript.entries.{incident_id}` |
| TDE-08 | The system SHALL handle overlapping speech by prioritizing the dominant audio signal |

### 4.3 NLP Classification Engine (NCE)

| ID | Requirement |
|---|---|
| NCE-01 | The system SHALL process each Transcript Entry through the LLM classification pipeline within 2 seconds of receipt |
| NCE-02 | The system SHALL classify each utterance into one or more of: `FACT`, `HYPOTHESIS`, `DECISION`, `ACTION_ITEM`, `QUESTION`, `STATUS_UPDATE`, `SOCIAL` |
| NCE-03 | The system SHALL extract structured entities from each utterance: systems, services, timestamps, metrics, error codes, URLs, people, tools |
| NCE-04 | The system SHALL assign a confidence score (0.0–1.0) to each classification |
| NCE-05 | The system SHALL detect when a new utterance contradicts an existing Fact with ≥80% confidence and create a CONFLICT record |
| NCE-06 | The system SHALL detect ACTION_ITEM entries with no assigned owner and flag them as `UNASSIGNED` |
| NCE-07 | The system SHALL detect QUESTION entries that receive no related response within 5 minutes and escalate to `UNRESOLVED_QUESTION` |
| NCE-08 | The system SHALL batch classify using the system prompt that defines the classification schema in structured JSON |
| NCE-09 | The system SHALL maintain a running context window of the last 50 transcript entries to enable coherent classification |
| NCE-10 | The system SHALL publish Classification Records to Kafka topic `classifications.{incident_id}` |

### 4.4 Incident State Manager (ISM)

| ID | Requirement |
|---|---|
| ISM-01 | The system SHALL maintain a single authoritative Incident State object per active incident |
| ISM-02 | The Incident State SHALL include: `{incident_id, title, severity, status, start_ts, affected_systems, timeline[], facts[], hypotheses[], decisions[], action_items[], questions[], conflicts[], risks[], participants[]}` |
| ISM-03 | The system SHALL update the Incident State upon every new Classification Record within 500ms |
| ISM-04 | The system SHALL persist every state change as an immutable event in the Event Log |
| ISM-05 | The system SHALL support manual override: human participants may promote hypotheses to facts, resolve action items, or dismiss conflicts via the dashboard |
| ISM-06 | The system SHALL broadcast Incident State deltas to all connected dashboard clients via WebSocket |
| ISM-07 | The system SHALL maintain full Incident State history for audit retrieval for a minimum of 90 days |

### 4.5 Voice Synthesis Engine (VSE)

| ID | Requirement |
|---|---|
| VSE-01 | The system SHALL generate spoken audio output using TTS (ElevenLabs or AWS Polly) with a distinct VAIC voice |
| VSE-02 | All VAIC spoken output SHALL begin with the prefix "VAIC summary:" or "VAIC notice:" to be clearly identifiable as AI |
| VSE-03 | The system SHALL deliver status summaries at a configurable interval (default: 15 minutes, range: 5–60 minutes) |
| VSE-04 | The system SHALL respond to voice commands: "VAIC, status", "VAIC, open actions", "VAIC, what do we know?", "VAIC, conflicts" |
| VSE-05 | The system SHALL announce in real time when a new high-confidence CONFLICT is detected |
| VSE-06 | The system SHALL verbally read out a proposed tool action and wait for verbal confirmation before executing |
| VSE-07 | The system SHALL produce a spoken end-of-incident summary upon `incident.resolved` event |
| VSE-08 | Voice commands SHALL be detected within 2 seconds of utterance completion |

### 4.6 Tool Integration Gateway (TIG)

| ID | Requirement |
|---|---|
| TIG-01 | The system SHALL implement a Confirmation Gate for all write operations — no external tool action executes without human approval |
| TIG-02 | The system SHALL integrate with Slack: post messages, create threads, send DMs, with pre-approved channel configuration |
| TIG-03 | The system SHALL integrate with Jira: create issues, add comments, transition statuses, assign users |
| TIG-04 | The system SHALL integrate with PagerDuty: acknowledge alerts, add incident notes, trigger escalations |
| TIG-05 | The system SHALL integrate with Datadog, Grafana, and New Relic (v1.5): pull metric snapshots and surface them in the dashboard |
| TIG-06 | All integration credentials SHALL be stored in Vault or AWS Secrets Manager, never in environment variables or source code |
| TIG-07 | The system SHALL retry failed integration calls up to 3 times with exponential backoff |
| TIG-08 | The system SHALL log all tool actions (proposed, confirmed, rejected, executed) to the Audit Log |
| TIG-09 | The system SHALL notify the IC via dashboard and voice if a tool integration fails |

### 4.7 Dashboard Frontend (DFE)

| ID | Requirement |
|---|---|
| DFE-01 | The system SHALL serve a web-based dashboard at `https://vaic.{org}.app/incident/{id}` |
| DFE-02 | The dashboard SHALL update in real time via WebSocket without page refresh |
| DFE-03 | The dashboard SHALL render panels for: Timeline, Facts, Hypotheses, Decisions, Action Items, Conflicts, Open Questions, Participant List |
| DFE-04 | The dashboard SHALL allow inline editing of VAIC-extracted items with attribution to the human editor |
| DFE-05 | The dashboard SHALL display confidence scores and evidence links for each extracted item |
| DFE-06 | The dashboard SHALL allow ICs to confirm or reject proposed tool actions |
| DFE-07 | The dashboard SHALL display a "Business Impact" panel visible to observer-level users |
| DFE-08 | The dashboard SHALL be responsive and function on tablet screens (768px minimum width) |

### 4.8 Post-Incident Report Generator (PRG)

| ID | Requirement |
|---|---|
| PRG-01 | The system SHALL generate an ISR within 2 minutes of the IC declaring incident resolved |
| PRG-02 | The ISR SHALL include: Executive Summary, Timeline, Confirmed Facts, Decisions Made, Actions Taken, Unresolved Risks, Participant Contributions |
| PRG-03 | The system SHALL export ISR in: Markdown, PDF, and Confluence API-compatible format |
| PRG-04 | The system SHALL post the ISR draft to the configured Slack channel with a review link |
| PRG-05 | The ISR SHALL clearly distinguish VAIC-generated content from human-edited content |

---

## 5. Non-Functional Requirements

### 5.1 Performance

| Metric | Requirement |
|---|---|
| Audio-to-Transcript Latency | ≤500ms (P95) |
| Transcript-to-Classification Latency | ≤2000ms (P95) |
| Dashboard Update Latency | ≤500ms after state change |
| Voice Command Response Time | ≤2000ms from utterance end |
| Concurrent Incidents Supported | ≥50 without degradation |
| Participants per Incident | ≥50 audio streams |
| API Response Time (REST) | ≤200ms (P95) |
| TTS Generation Time | ≤1000ms for up to 100 words |

### 5.2 Reliability

- System uptime target: 99.9% (≤8.7 hours downtime/year)
- Audio processing pipeline must recover from transient failures within 5 seconds without data loss
- Kafka consumer groups ensure no utterance is missed even during processing failures
- All microservices must implement health checks and graceful degradation

### 5.3 Availability

- Active-active deployment across 2 availability zones minimum
- Zero-downtime deployments via rolling update strategy
- Circuit breakers on all external integrations (Slack, Jira, PagerDuty)
- Dashboard continues to function if LLM service is temporarily degraded (shows raw transcripts)

### 5.4 Scalability

- Horizontal scaling of all stateless services via Kubernetes HPA
- Audio ingestion pods scale based on active audio stream count
- LLM classification queue depth triggers worker scaling
- Database read replicas for dashboard queries during high-load incidents

### 5.5 Maintainability

- All services must expose `/health`, `/ready`, and `/metrics` endpoints
- Code coverage ≥80% on all backend services
- All APIs versioned (e.g., `/api/v1/`)
- Structured logging (JSON) with correlation IDs across all services

---

## 6. Security Requirements

### 6.1 Authentication

- All user access via OAuth 2.0 / OIDC (Google, Microsoft, Okta supported)
- Service-to-service authentication via mTLS
- VAIC bot authentication to conference platforms via platform-issued SDK credentials
- API keys for integrations stored in HashiCorp Vault with automatic rotation every 90 days

### 6.2 Authorization

- Role-Based Access Control (RBAC): IC, Responder, Observer, BusinessStakeholder, PlatformAdmin
- Attribute-based access for multi-tenant isolation: users can only access incidents within their organization
- Confirmation Gate policy: only IC role may approve tool write actions during live incidents

### 6.3 Data Security

- Audio streams encrypted in transit: TLS 1.3 minimum
- Audio stored at rest: AES-256-GCM
- By default, audio is NOT persisted beyond session — transcripts only retained
- Transcript retention policy: configurable per organization (default: 90 days)
- Personal data minimization: speaker voice embeddings not stored by default

### 6.4 Network Security

- All services deployed within private VPC; no public-facing ports except load balancer
- Web Application Firewall (WAF) on all external endpoints
- DDoS protection via cloud-native shield services
- Regular penetration testing (quarterly)

---

## 7. Performance Requirements

*See Section 5.1 — performance requirements are consolidated there.*

Additional specifics:

- **ASR Model Inference:** Whisper Large V3 on NVIDIA A10G GPU instances — target ≤300ms per 500ms audio chunk
- **LLM Classification:** claude-sonnet-4-6 via Anthropic API — target ≤1500ms per utterance batch (10 entries)
- **WebSocket Throughput:** Dashboard must handle ≥1000 concurrent WebSocket connections per incident
- **Database Write Throughput:** PostgreSQL must sustain ≥500 incident state writes/second under load

---

## 8. Database Requirements

### 8.1 PostgreSQL (Primary Relational Store)

**Tables Required:**

```sql
organizations (id, name, slug, settings_json, created_at)
users (id, org_id, name, email, role, voice_embedding_ref, created_at)
incidents (id, org_id, title, severity, status, start_ts, resolved_ts, conference_url, settings_json)
participants (id, incident_id, user_id, speaker_label, role, joined_at, left_at)
transcript_entries (id, incident_id, participant_id, text, start_ts, end_ts, confidence, raw_audio_ref)
classifications (id, transcript_entry_id, type, subtype, confidence, entities_json, created_at)
facts (id, incident_id, text, source_classification_id, status, confirmed_by, created_at)
hypotheses (id, incident_id, text, source_classification_id, status, created_at)
decisions (id, incident_id, text, decided_by, created_at)
action_items (id, incident_id, text, owner_id, status, due_hint, source_classification_id, created_at, updated_at)
questions (id, incident_id, text, asked_by, status, answered_at, created_at)
conflicts (id, incident_id, fact_a_id, fact_b_id, description, status, resolved_by, created_at)
tool_actions (id, incident_id, tool, action_type, payload_json, proposed_by, confirmed_by, status, executed_at)
audit_log (id, incident_id, actor_id, action, details_json, created_at)
```

### 8.2 Redis (Cache & Pub/Sub)

- Cache: Current incident state object per incident_id (TTL: incident duration)
- Cache: LLM context window (last 50 transcript entries) per incident_id
- Pub/Sub: Incident state delta broadcast channel per incident_id
- Session storage: JWT session data

### 8.3 ClickHouse (Analytics — v1.5)

- Append-only event store for historical pattern analysis
- Optimized for time-series incident event queries
- Powers the "similar past incidents" feature

---

## 9. API Requirements

### 9.1 REST API (Internal & External)

**Base URL:** `https://api.vaic.app/v1/`

| Endpoint | Method | Description | Auth |
|---|---|---|---|
| `/incidents` | POST | Create new incident | IC |
| `/incidents/{id}` | GET | Get full incident state | All roles |
| `/incidents/{id}/resolve` | POST | Declare incident resolved | IC |
| `/incidents/{id}/facts` | GET/POST | List/Add facts | All/IC+Responder |
| `/incidents/{id}/action-items` | GET/POST/PATCH | Manage action items | All/IC+Responder |
| `/incidents/{id}/conflicts` | GET | List conflicts | All |
| `/incidents/{id}/conflicts/{cid}/resolve` | POST | Resolve conflict | IC |
| `/incidents/{id}/tool-actions` | POST | Propose tool action | VAIC System |
| `/incidents/{id}/tool-actions/{aid}/confirm` | POST | Confirm action | IC |
| `/incidents/{id}/tool-actions/{aid}/reject` | POST | Reject action | IC |
| `/incidents/{id}/report` | GET | Download ISR | All |
| `/webhooks/zoom` | POST | Zoom event webhook | System |
| `/webhooks/pagerduty` | POST | PagerDuty event webhook | System |

### 9.2 WebSocket API

- **Endpoint:** `wss://api.vaic.app/v1/incidents/{id}/stream`
- **Events Published:** `state.delta`, `new.transcript`, `new.classification`, `new.conflict`, `action.proposed`, `action.executed`
- **Heartbeat:** 30-second ping/pong
- **Authentication:** JWT token in initial upgrade handshake

### 9.3 Internal Kafka Topics

| Topic | Producers | Consumers |
|---|---|---|
| `audio.raw.{incident_id}` | Audio Ingestion Service | Transcription Engine |
| `transcript.entries.{incident_id}` | Transcription Engine | NLP Classification Engine |
| `classifications.{incident_id}` | NLP Classification Engine | Incident State Manager, Voice Synthesis Engine |
| `state.deltas.{incident_id}` | Incident State Manager | Dashboard Gateway, Report Generator |
| `tool.proposals.{incident_id}` | NLP Classification Engine | Tool Integration Gateway |
| `audit.events` | All Services | Audit Log Consumer |

---

## 10. Third-Party Integrations

### 10.1 Zoom Video SDK
- **Purpose:** Join meetings as bot participant and ingest audio
- **Auth:** Server-to-Server OAuth (App credentials)
- **Scope:** `meeting:read`, `meeting:write` (for bot management)
- **Failure Mode:** Fallback to manual audio upload or SIP bridge

### 10.2 Anthropic Claude API
- **Purpose:** LLM classification and entity extraction
- **Model:** `claude-sonnet-4-6`
- **Auth:** API Key (stored in Vault)
- **Rate Limits:** Handle 429 with exponential backoff; queue classification jobs
- **Failure Mode:** Queue utterances; process in bulk when service recovers

### 10.3 OpenAI Whisper Large V3 (Self-hosted)
- **Purpose:** Speech-to-text transcription
- **Deployment:** Self-hosted on GPU instances for data residency
- **Fallback:** AssemblyAI API (cloud) for burst capacity

### 10.4 pyannote.audio
- **Purpose:** Speaker diarization
- **Deployment:** Self-hosted Python service
- **Models:** `pyannote/speaker-diarization-3.1`

### 10.5 ElevenLabs / AWS Polly
- **Purpose:** Text-to-speech for VAIC spoken output
- **Primary:** ElevenLabs (higher naturalness)
- **Fallback:** AWS Polly (for latency or cost constraints)

### 10.6 Slack Web API
- **Auth:** Bot OAuth token with scopes: `chat:write`, `channels:read`, `files:write`
- **Actions:** Post messages, create threads, upload files (ISR)

### 10.7 Jira REST API v3
- **Auth:** API Token + email (Basic Auth or OAuth 2.0)
- **Actions:** Create issues, add comments, transition status, assign users

### 10.8 PagerDuty Events API v2
- **Auth:** API Key
- **Actions:** Acknowledge, add notes, trigger escalation policies

### 10.9 Datadog / Grafana (v1.5)
- **Auth:** API Key / Service Account Token
- **Actions:** Query dashboards, pull metric snapshots for incident context

---

## 11. External Interfaces

### 11.1 User Interface
- Web Dashboard: React SPA served via CDN
- Voice Input: Conference platform audio channel
- Voice Output: TTS injected into conference audio stream

### 11.2 Hardware Interface
- No direct hardware dependency; cloud-native
- GPU (NVIDIA A10G or A100) required for Whisper inference nodes

### 11.3 Software Interfaces
- Kubernetes 1.28+ for container orchestration
- Nginx Ingress Controller for routing
- Prometheus + Grafana for metrics
- Loki for log aggregation
- Jaeger for distributed tracing

### 11.4 Communications Interfaces
- All external API communication over HTTPS (TLS 1.3)
- Internal service communication over gRPC (mTLS)
- WebSocket for real-time dashboard streaming
- Kafka for internal event streaming

---

## 12. Error Handling & Logging

### 12.1 Error Handling

| Error Type | Handling Strategy |
|---|---|
| Audio stream interruption | Buffer last 5s; reconnect; resume without gap |
| ASR service failure | Queue audio; alert IC; display "transcription paused" |
| LLM API timeout/error | Retry 3x with backoff; queue utterance; notify via dashboard |
| Tool integration failure | Surface error on dashboard; speak "VAIC: Slack post failed"; log to audit |
| WebSocket disconnect | Client auto-reconnects; server replays last 100 events |
| Database write failure | Kafka-backed event sourcing ensures no data loss |

### 12.2 Logging Requirements

- All logs in structured JSON format
- Log levels: DEBUG, INFO, WARN, ERROR, FATAL
- Mandatory fields: `timestamp`, `service`, `incident_id`, `correlation_id`, `level`, `message`
- Sensitive data (audio content, PII) must be masked before logging
- Log retention: 30 days hot, 1 year cold (S3 Glacier)

---

## 13. Monitoring

| Signal | Tool | Alert Threshold |
|---|---|---|
| Audio ingestion lag | Prometheus | >1s sustained for 30s |
| LLM classification queue depth | Prometheus | >100 pending utterances |
| API error rate | Prometheus | >1% of requests |
| WebSocket connection failures | Prometheus | >5% disconnection rate |
| TTS generation latency | Prometheus | P95 >2s |
| Database connection pool saturation | Prometheus | >80% used |
| Tool integration failure rate | Prometheus | >10% over 5 minutes |

All alerts route to PagerDuty on-call schedule.

---

## 14. Backup & Recovery

- **PostgreSQL:** Continuous WAL archiving to S3; point-in-time recovery to within 5 minutes
- **Redis:** Persistence via RDB snapshots every 60 seconds; replica for failover
- **Kafka:** Replication factor 3; topic retention 7 days
- **RTO:** Recovery Time Objective ≤15 minutes for full service restoration
- **RPO:** Recovery Point Objective ≤5 minutes of data loss

---

## 15. Compliance

| Regulation | Requirement | Implementation |
|---|---|---|
| GDPR | Audio data minimization; right to erasure | Default: no audio persistence; transcript deletion API |
| CCPA | Data disclosure and deletion rights | Privacy API + admin console |
| SOC 2 Type II | Access control, availability, confidentiality | RBAC, encryption, audit logs, uptime monitoring |
| HIPAA (future) | PHI handling for healthcare customers | Dedicated BAA-compliant deployment option |

---

## 16. Testing Requirements

| Test Type | Coverage Target | Tooling |
|---|---|---|
| Unit Tests | ≥80% line coverage | Jest (TS), pytest (Python) |
| Integration Tests | All API endpoints, all Kafka flows | Supertest, pytest |
| End-to-End Tests | 10 critical user journeys | Playwright |
| ASR Accuracy Tests | WER validation on curated audio dataset | Custom test harness |
| Classification Accuracy Tests | Precision/recall on labeled incident transcripts | Evaluation pipeline |
| Load Tests | 50 concurrent incidents, 50 participants each | k6 |
| Security Tests | OWASP Top 10 coverage | ZAP, Snyk, Trivy |
| Chaos Tests | Network partition, pod failure, Kafka partition loss | Chaos Mesh |

---

## 17. Deployment Requirements

- **Container Registry:** AWS ECR or GCP Artifact Registry
- **Orchestration:** Kubernetes 1.28+ with Helm charts for each service
- **CI/CD:** GitHub Actions → automated test → build → staging deploy → manual approval → production
- **Infrastructure as Code:** Terraform for all cloud resources
- **Secrets Management:** HashiCorp Vault (self-hosted) or AWS Secrets Manager
- **Environment Parity:** dev / staging / production environments must be functionally identical
- **Blue-Green or Canary Deployment:** Required for the Audio Ingestion Service and NLP Classification Engine
- **Minimum Node Configuration:**
  - Control Plane: 3 nodes (t3.xlarge or equivalent)
  - Audio/GPU Nodes: 2 NVIDIA A10G-equipped nodes for Whisper inference
  - General Compute: 6 nodes (m5.2xlarge or equivalent) for application services
