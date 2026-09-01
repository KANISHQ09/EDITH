# System Design Document
## Voice AI Incident Commander (VAIC)

**Version:** 1.0.0
**Date:** August 2026

---

## 1. High-Level Architecture

VAIC follows a **event-driven microservices architecture** with a streaming data pipeline at its core. Audio flows from conference platforms through a multi-stage processing pipeline — transcription → diarization → LLM classification → state management — while a separate WebSocket gateway broadcasts real-time updates to the dashboard, and a voice synthesis engine returns spoken output to the conference room.

```mermaid
graph TB
    subgraph ConferencePlatforms["🎙️ Conference Platforms"]
        ZOOM[Zoom SDK]
        MEET[Google Meet]
        TEAMS[MS Teams]
    end

    subgraph AudioLayer["🔊 Audio Layer"]
        AIS[Audio Ingestion Service]
        TDE[Transcription & Diarization Engine\nWhisper V3 + pyannote]
    end

    subgraph IntelligenceLayer["🧠 Intelligence Layer"]
        NCE[NLP Classification Engine\nClaude claude-sonnet-4-6]
        ISM[Incident State Manager]
        CDM[Conflict & Gap Detector]
    end

    subgraph DataLayer["💾 Data Layer"]
        KAFKA[(Apache Kafka)]
        PG[(PostgreSQL)]
        REDIS[(Redis)]
    end

    subgraph OutputLayer["📤 Output Layer"]
        VSE[Voice Synthesis Engine\nElevenLabs / Polly]
        DFE[Dashboard Frontend\nReact + WebSocket]
        TIG[Tool Integration Gateway]
        PRG[Post-Incident Report Generator]
    end

    subgraph ExternalTools["🔗 External Tools"]
        SLACK[Slack]
        JIRA[Jira]
        PD[PagerDuty]
        DD[Datadog]
    end

    ConferencePlatforms -->|Audio Stream| AIS
    AIS -->|PCM Audio Chunks| KAFKA
    KAFKA -->|audio.raw| TDE
    TDE -->|Transcript Entries| KAFKA
    KAFKA -->|transcript.entries| NCE
    NCE -->|Classifications| KAFKA
    KAFKA -->|classifications| ISM
    ISM <--> PG
    ISM <--> REDIS
    ISM -->|State Deltas| KAFKA
    KAFKA -->|state.deltas| DFE
    KAFKA -->|classifications| CDM
    CDM -->|Conflicts| ISM
    KAFKA -->|state.deltas| VSE
    VSE -->|TTS Audio| ConferencePlatforms
    KAFKA -->|tool.proposals| TIG
    TIG -->|With Confirmation| ExternalTools
    ISM -->|On Resolve| PRG
    PRG --> SLACK

    style AudioLayer fill:#1e3a5f,color:#fff
    style IntelligenceLayer fill:#2d1b69,color:#fff
    style DataLayer fill:#1a3a2a,color:#fff
    style OutputLayer fill:#3d1a1a,color:#fff
```

---

## 2. Low-Level Architecture

### 2.1 Audio Processing Pipeline

```mermaid
sequenceDiagram
    participant ZOOM as Zoom SDK
    participant AIS as Audio Ingestion Service
    participant KAFKA as Kafka
    participant TDE as Transcription Engine
    participant DIA as Diarization Service
    participant NCE as NLP Classification Engine
    participant ISM as Incident State Manager
    participant WSG as WebSocket Gateway
    participant DASH as Dashboard

    ZOOM->>AIS: Raw PCM audio (per-participant channel)
    AIS->>AIS: Buffer 500ms segments
    AIS->>KAFKA: Publish {incident_id, participant_id, audio_chunk, ts}
    KAFKA->>TDE: Consume audio.raw.{incident_id}
    TDE->>TDE: Whisper inference → text
    TDE->>DIA: Send audio + text for alignment
    DIA->>TDE: Speaker segments aligned
    TDE->>KAFKA: Publish TranscriptEntry {speaker, text, ts, confidence}
    KAFKA->>NCE: Consume transcript.entries.{incident_id}
    NCE->>NCE: Build context window (last 50 entries)
    NCE->>NCE: Claude API: classify + extract entities
    NCE->>KAFKA: Publish ClassificationRecord
    KAFKA->>ISM: Consume classifications.{incident_id}
    ISM->>ISM: Apply delta to Incident State
    ISM->>WSG: Push state delta
    WSG->>DASH: WebSocket event: state.delta
    DASH->>DASH: Re-render updated panels
```

### 2.2 Confirmation Gate Flow

```mermaid
sequenceDiagram
    participant NCE as NLP Engine
    participant TIG as Tool Gateway
    participant ISM as Incident State
    participant VSE as Voice Synth
    participant ZOOM as Conference Room
    participant IC as Incident Commander
    participant SLACK as Slack

    NCE->>TIG: Propose action {tool: slack, channel: #incidents, message: "..."}
    TIG->>ISM: Store proposal (status: PENDING)
    TIG->>VSE: "VAIC: I'd like to post to #incidents-p1: [reads message]. Confirm?"
    VSE->>ZOOM: Speak confirmation request
    IC->>ZOOM: "VAIC, confirm" (or clicks Confirm on dashboard)
    ZOOM->>TIG: Verbal confirmation detected / Dashboard confirmation received
    TIG->>SLACK: Execute: post message
    SLACK-->>TIG: 200 OK
    TIG->>ISM: Update action status: EXECUTED
    TIG->>VSE: "VAIC: Slack message posted to #incidents-p1"
    VSE->>ZOOM: Speak confirmation
```

---

## 3. Component Diagram

```mermaid
graph LR
    subgraph Frontend["Frontend Layer"]
        REACT[React Dashboard\nNext.js 14]
        WS_CLIENT[WebSocket Client]
        REACT --- WS_CLIENT
    end

    subgraph APIGateway["API Gateway"]
        NGINX[Nginx Ingress]
        API[REST API\nNode.js / Express]
        WSG[WebSocket Gateway\nNode.js / ws]
    end

    subgraph CoreServices["Core Services"]
        AIS[Audio Ingestion\nNode.js]
        TDE[Transcription Engine\nPython / FastAPI]
        DIAR[Diarization Service\nPython / FastAPI]
        NCE[Classification Engine\nPython / FastAPI]
        ISM[State Manager\nNode.js]
        VSE[Voice Synth Engine\nPython]
        TIG[Tool Gateway\nNode.js]
        PRG[Report Generator\nPython]
        CDM[Conflict Detector\nPython]
    end

    subgraph DataStores["Data Stores"]
        PG[(PostgreSQL 15)]
        REDIS[(Redis 7)]
        KAFKA[(Kafka 3.5)]
        S3[(S3 / GCS)]
    end

    subgraph AIInference["AI Inference"]
        WHISPER[Whisper V3\nGPU Pod]
        PYANNOTE[pyannote.audio\nGPU Pod]
        CLAUDE[Anthropic API\nExternal]
        TTS[ElevenLabs API\nExternal]
    end

    REACT --> NGINX
    NGINX --> API
    NGINX --> WSG
    AIS --> KAFKA
    KAFKA --> TDE
    TDE --> WHISPER
    TDE --> PYANNOTE
    KAFKA --> NCE
    NCE --> CLAUDE
    KAFKA --> ISM
    ISM --> PG
    ISM --> REDIS
    ISM --> WSG
    KAFKA --> VSE
    VSE --> TTS
    KAFKA --> TIG
    TIG --> PRG
    ISM --> PRG
    KAFKA --> CDM
    CDM --> ISM
    PRG --> S3
```

---

## 4. Data Flow

```mermaid
flowchart TD
    AUDIO([🎙️ Audio Stream]) --> CHUNKS[500ms Audio Chunks]
    CHUNKS --> TRANSCRIPT[Transcript Entry\n{speaker, text, ts, confidence}]
    TRANSCRIPT --> CLASS[Classification Record\n{type, entities, confidence}]

    CLASS --> FACT{Type?}
    FACT -->|FACT| FACTS_REG[Facts Registry]
    FACT -->|HYPOTHESIS| HYP_REG[Hypotheses Registry]
    FACT -->|DECISION| DEC_REG[Decisions Registry]
    FACT -->|ACTION_ITEM| AI_REG[Action Items Registry]
    FACT -->|QUESTION| Q_REG[Questions Registry]
    FACT -->|STATUS_UPDATE| TIMELINE[Incident Timeline]

    FACTS_REG --> CONFLICT{Conflicts with\nexisting fact?}
    CONFLICT -->|Yes| CONFLICT_REG[Conflicts Registry]
    CONFLICT -->|No| STATE[Incident State Object]

    AI_REG --> OWNER{Owner\nassigned?}
    OWNER -->|No| UNASSIGNED[Unassigned AIs]
    OWNER -->|Yes| STATE

    Q_REG --> ANSWERED{Answered\nwithin 5min?}
    ANSWERED -->|No| UNRESOLVED_Q[Unresolved Questions]
    ANSWERED -->|Yes| STATE

    STATE --> DELTA[State Delta]
    DELTA --> WS[WebSocket Broadcast]
    DELTA --> VOICE[Voice Summary\n@ interval or command]
    DELTA --> TOOLS{Tool Action\nDetected?}
    TOOLS -->|Yes| CONFIRM[Confirmation Gate]
    CONFIRM -->|Approved| EXECUTE[Execute Integration]
    CONFIRM -->|Rejected| LOG[Audit Log]
```

---

## 5. Module Breakdown

| Module | Language | Framework | Responsibility |
|---|---|---|---|
| Audio Ingestion Service | Node.js | Express + Zoom Video SDK | Conference bot; audio stream capture |
| Transcription Engine | Python | FastAPI | Whisper V3 inference; utterance detection |
| Diarization Service | Python | FastAPI | pyannote speaker segmentation + identity mapping |
| NLP Classification Engine | Python | FastAPI | Claude API calls; entity extraction; JSON parsing |
| Conflict & Gap Detector | Python | FastAPI | Rule + LLM-based conflict detection |
| Incident State Manager | Node.js | Express | State CRUD; Kafka consumer; WebSocket emit |
| Voice Synthesis Engine | Python | FastAPI | TTS generation; command detection; audio injection |
| Tool Integration Gateway | Node.js | Express | Slack/Jira/PagerDuty integration; confirmation gate |
| Post-Incident Report Generator | Python | FastAPI | LLM-based report generation; PDF/Markdown export |
| Dashboard Frontend | TypeScript | Next.js 14 + React | Real-time incident dashboard |
| WebSocket Gateway | Node.js | ws library | Client connection management; event fan-out |
| REST API | Node.js | Express | External-facing HTTP API |
| API Gateway | Infrastructure | Nginx | TLS termination; routing; rate limiting |

---

## 6. Database Design

### 6.1 Entity-Relationship Diagram

```mermaid
erDiagram
    ORGANIZATIONS ||--o{ USERS : "has"
    ORGANIZATIONS ||--o{ INCIDENTS : "owns"
    INCIDENTS ||--o{ PARTICIPANTS : "has"
    INCIDENTS ||--o{ TRANSCRIPT_ENTRIES : "contains"
    INCIDENTS ||--o{ FACTS : "tracks"
    INCIDENTS ||--o{ HYPOTHESES : "tracks"
    INCIDENTS ||--o{ DECISIONS : "records"
    INCIDENTS ||--o{ ACTION_ITEMS : "manages"
    INCIDENTS ||--o{ QUESTIONS : "captures"
    INCIDENTS ||--o{ CONFLICTS : "detects"
    INCIDENTS ||--o{ TOOL_ACTIONS : "logs"
    TRANSCRIPT_ENTRIES ||--o{ CLASSIFICATIONS : "produces"
    CLASSIFICATIONS }o--|| FACTS : "sources"
    CLASSIFICATIONS }o--|| ACTION_ITEMS : "sources"
    PARTICIPANTS ||--o{ ACTION_ITEMS : "owns"
    FACTS ||--o{ CONFLICTS : "participates in"
    USERS }|--|| PARTICIPANTS : "maps to"

    ORGANIZATIONS {
        uuid id PK
        string name
        string slug
        jsonb settings
        timestamp created_at
    }

    INCIDENTS {
        uuid id PK
        uuid org_id FK
        string title
        enum severity
        enum status
        timestamp start_ts
        timestamp resolved_ts
        string conference_url
        string[] affected_systems
        jsonb settings
    }

    TRANSCRIPT_ENTRIES {
        uuid id PK
        uuid incident_id FK
        uuid participant_id FK
        text content
        timestamp start_ts
        timestamp end_ts
        float confidence
        string audio_ref
    }

    CLASSIFICATIONS {
        uuid id PK
        uuid transcript_entry_id FK
        enum type
        float confidence
        jsonb entities
        timestamp created_at
    }

    ACTION_ITEMS {
        uuid id PK
        uuid incident_id FK
        uuid owner_id FK
        uuid source_classification_id FK
        text description
        enum status
        string due_hint
        timestamp created_at
        timestamp updated_at
    }

    CONFLICTS {
        uuid id PK
        uuid incident_id FK
        uuid fact_a_id FK
        uuid fact_b_id FK
        text description
        enum status
        uuid resolved_by FK
        timestamp created_at
    }

    TOOL_ACTIONS {
        uuid id PK
        uuid incident_id FK
        string tool
        string action_type
        jsonb payload
        uuid proposed_by FK
        uuid confirmed_by FK
        enum status
        timestamp executed_at
    }
```

---

## 7. AI Pipeline

```mermaid
flowchart LR
    subgraph ASR["ASR Pipeline"]
        AUDIO[Audio Chunk\n500ms PCM] --> VAD[Voice Activity\nDetection]
        VAD -->|Speech detected| WHISPER[Whisper Large V3\nGPU Inference]
        WHISPER --> TEXT[Raw Transcript Text]
    end

    subgraph DIAR["Diarization Pipeline"]
        AUDIO2[Audio Chunk] --> PYANNOTE[pyannote.audio\nspeaker-diarization-3.1]
        PYANNOTE --> SEGMENTS[Speaker Segments\n{speaker_label, start, end}]
        SEGMENTS --> ALIGN[Align with\nTranscript Text]
        TEXT --> ALIGN
        ALIGN --> ATTRIBUTED[Attributed Utterance\n{speaker, text, ts}]
    end

    subgraph LLM["LLM Classification Pipeline"]
        ATTRIBUTED --> CONTEXT[Build Context Window\nLast 50 utterances]
        CONTEXT --> PROMPT[Construct Classification Prompt]
        PROMPT --> CLAUDE[Claude claude-sonnet-4-6\nAnthropic API]
        CLAUDE --> JSON_RESP[JSON Response\n{type, entities, confidence}]
        JSON_RESP --> VALIDATE[Schema Validation\nPydantic]
        VALIDATE --> RECORD[Classification Record]
    end

    subgraph CONFLICT["Conflict Detection"]
        RECORD --> EMBED[Semantic Embedding\ntext-embedding-3-small]
        EMBED --> SEARCH[Vector Similarity Search\nvs existing facts]
        SEARCH --> THRESHOLD{Similarity > 0.85\nAND Contradicts?}
        THRESHOLD -->|Yes| CONFLICT_LLM[Claude: Confirm Contradiction]
        CONFLICT_LLM --> CONFLICT_RECORD[Conflict Record]
    end
```

### 7.1 Classification Prompt Design

```
System: You are an incident intelligence extraction engine. 
Classify each utterance from an ongoing technical incident response call.

For each utterance, return ONLY valid JSON matching this schema:
{
  "type": "FACT | HYPOTHESIS | DECISION | ACTION_ITEM | QUESTION | STATUS_UPDATE | SOCIAL",
  "confidence": 0.0-1.0,
  "summary": "concise restatement",
  "entities": {
    "systems": [],
    "people": [],
    "timestamps": [],
    "metrics": [],
    "error_codes": []
  },
  "action_item_owner": "name or null",
  "requires_followup": true|false
}

Context (last 10 entries):
[CONTEXT WINDOW]

Current utterance:
Speaker: {speaker_name} ({role})
Text: "{utterance_text}"
```

---

## 8. Cloud Architecture

```mermaid
graph TB
    subgraph Internet
        USERS[Users & Conference\nPlatforms]
    end

    subgraph AWS["AWS Region (us-east-1)"]
        subgraph VPC["VPC 10.0.0.0/16"]
            subgraph PublicSubnets["Public Subnets"]
                ALB[Application Load\nBalancer]
                NAT[NAT Gateway]
            end

            subgraph PrivateSubnets["Private Subnets"]
                subgraph EKS["EKS Cluster"]
                    subgraph AppNodes["App Node Group (m5.2xlarge)"]
                        API_POD[API Pods]
                        ISM_POD[State Manager Pods]
                        TIG_POD[Tool Gateway Pods]
                        WSG_POD[WebSocket Gateway Pods]
                        FRONTEND[Next.js Frontend Pods]
                    end

                    subgraph AINodes["AI Node Group (g5.2xlarge GPU)"]
                        WHISPER_POD[Whisper ASR Pods]
                        PYANNOTE_POD[Diarization Pods]
                        NCE_POD[Classification Engine Pods]
                        VSE_POD[Voice Synth Pods]
                    end
                end

                subgraph DataTier["Data Tier"]
                    RDS[RDS PostgreSQL\nMulti-AZ]
                    ELASTICACHE[ElastiCache Redis\nCluster Mode]
                    MSK[MSK Kafka\n3-broker cluster]
                end
            end
        end

        subgraph Services["AWS Services"]
            S3_BUCKET[S3 Buckets\nAudio + Reports]
            SECRETS[Secrets Manager]
            CLOUDWATCH[CloudWatch]
            ECR[ECR Container\nRegistry]
        end
    end

    subgraph ExternalAPIs["External APIs"]
        ANTHROPIC[Anthropic\nClaude API]
        ELEVENLABS[ElevenLabs\nTTS API]
        ZOOM_API[Zoom API]
    end

    USERS --> ALB
    ALB --> API_POD
    ALB --> WSG_POD
    ALB --> FRONTEND
    API_POD --> ISM_POD
    ISM_POD --> RDS
    ISM_POD --> ELASTICACHE
    WHISPER_POD --> MSK
    NCE_POD --> ANTHROPIC
    VSE_POD --> ELEVENLABS
    AIS_POD --> ZOOM_API
    APP_PODS --> SECRETS
```

---

## 9. Caching Strategy

| Data | Cache Location | TTL | Invalidation |
|---|---|---|---|
| Current Incident State | Redis (Hash) | Incident duration | On every state delta |
| LLM Context Window (last 50 utterances) | Redis (List) | Incident duration | Rolling append |
| User roles & permissions | Redis (Hash) | 5 minutes | On role change |
| Integration auth tokens | Redis (String) | Token expiry - 60s | On token refresh |
| TTS audio clips (repeated phrases) | Redis (String) | 1 hour | On content change |
| Dashboard session | Redis (Hash) | 24 hours | On logout |

---

## 10. Queue Architecture

```mermaid
graph LR
    subgraph Producers
        AIS[Audio Ingestion\nService]
        TDE[Transcription\nEngine]
        NCE[Classification\nEngine]
        ISM[State Manager]
    end

    subgraph Kafka["Apache Kafka (3 brokers, RF=3)"]
        T1[audio.raw.*\np=12, RF=3]
        T2[transcript.entries.*\np=6, RF=3]
        T3[classifications.*\np=6, RF=3]
        T4[state.deltas.*\np=6, RF=3]
        T5[tool.proposals.*\np=3, RF=3]
        T6[audit.events\np=3, RF=3]
    end

    subgraph Consumers
        TDE2[Transcription\nEngine]
        NCE2[Classification\nEngine]
        ISM2[State Manager]
        VSE[Voice Synth]
        WSG[WebSocket\nGateway]
        TIG[Tool Gateway]
        CDM[Conflict Detector]
        ALS[Audit Log\nService]
    end

    AIS --> T1
    TDE --> T2
    NCE --> T3
    ISM --> T4
    NCE --> T5
    ALL_SERVICES --> T6

    T1 --> TDE2
    T2 --> NCE2
    T3 --> ISM2
    T3 --> CDM
    T4 --> VSE
    T4 --> WSG
    T5 --> TIG
    T6 --> ALS
```

---

## 11. Security Architecture

```mermaid
flowchart TD
    USER[Browser User] --> WAF[AWS WAF]
    WAF --> ALB[Load Balancer\nTLS 1.3]
    ALB --> NGINX[Nginx\nRate Limiting]
    NGINX --> AUTH[Auth Middleware\nJWT Validation]
    AUTH --> RBAC[RBAC Check]
    RBAC --> API[API Service]
    API --> VAULT[HashiCorp Vault\nSecrets]
    VAULT --> INTEGRATIONS[External Tools]

    ZOOM_BOT[Zoom Bot] --> AIS[Audio Ingestion]
    AIS --> ENCRYPT[AES-256 Encrypt\nAudio in Transit]
    ENCRYPT --> KAFKA[Kafka TLS]

    SVC_A[Service A] --> MTLS[mTLS]
    MTLS --> SVC_B[Service B]
```

---

## 12. CI/CD Pipeline

```mermaid
graph LR
    PR[Developer\nPull Request] --> GH[GitHub Actions\nTrigger]
    GH --> LINT[Lint &\nType Check]
    LINT --> UNIT[Unit Tests\n≥80% coverage]
    UNIT --> BUILD[Docker\nBuild]
    BUILD --> SCAN[Snyk Security\nScan]
    SCAN --> PUSH[Push to ECR]
    PUSH --> STAGING[Deploy to\nStaging]
    STAGING --> E2E[Playwright\nE2E Tests]
    E2E --> LOAD[k6 Load\nTest - Smoke]
    LOAD --> APPROVAL{Manual\nApproval}
    APPROVAL -->|Approved| PROD[Deploy to\nProduction]
    PROD --> CANARY[5% Canary\nDeploy]
    CANARY --> MONITOR[Monitor Error\nRate 15min]
    MONITOR -->|Healthy| FULL[100% Rollout]
    MONITOR -->|Unhealthy| ROLLBACK[Auto Rollback]
```

---

## 13. Folder Structure

```
voice-ai-incident-commander/
├── services/
│   ├── audio-ingestion/              # Node.js - Zoom SDK bot
│   │   ├── src/
│   │   │   ├── bot/                  # Conference platform bots
│   │   │   ├── audio/                # Audio buffer & streaming
│   │   │   ├── kafka/                # Kafka producer
│   │   │   └── index.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── transcription-engine/         # Python - Whisper + Diarization
│   │   ├── src/
│   │   │   ├── asr/                  # Whisper inference
│   │   │   ├── diarization/          # pyannote pipeline
│   │   │   ├── alignment/            # Speaker-text alignment
│   │   │   ├── kafka/                # Consumer + producer
│   │   │   └── main.py
│   │   ├── Dockerfile.gpu
│   │   └── requirements.txt
│   │
│   ├── classification-engine/        # Python - Claude API
│   │   ├── src/
│   │   │   ├── prompts/              # Prompt templates
│   │   │   ├── classifiers/          # Type classifiers
│   │   │   ├── extractors/           # Entity extractors
│   │   │   ├── context/              # Context window manager
│   │   │   ├── kafka/                # Consumer + producer
│   │   │   └── main.py
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   ├── conflict-detector/            # Python - Conflict detection
│   │   ├── src/
│   │   │   ├── embeddings/           # Semantic similarity
│   │   │   ├── rules/                # Rule-based conflict detection
│   │   │   ├── llm/                  # LLM confirmation
│   │   │   └── main.py
│   │   └── requirements.txt
│   │
│   ├── incident-state-manager/       # Node.js - State management
│   │   ├── src/
│   │   │   ├── state/                # State model & mutations
│   │   │   ├── kafka/                # Consumer
│   │   │   ├── websocket/            # WebSocket emit
│   │   │   ├── db/                   # PostgreSQL + Redis
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── voice-synthesis-engine/       # Python - TTS + Command Detection
│   │   ├── src/
│   │   │   ├── commands/             # Voice command recognition
│   │   │   ├── summaries/            # Summary generation
│   │   │   ├── tts/                  # ElevenLabs / Polly integration
│   │   │   ├── scheduler/            # Interval-based summaries
│   │   │   └── main.py
│   │   └── requirements.txt
│   │
│   ├── tool-integration-gateway/     # Node.js - External tools
│   │   ├── src/
│   │   │   ├── confirmation/         # Confirmation gate logic
│   │   │   ├── integrations/
│   │   │   │   ├── slack/
│   │   │   │   ├── jira/
│   │   │   │   ├── pagerduty/
│   │   │   │   └── datadog/
│   │   │   ├── kafka/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── report-generator/             # Python - ISR generation
│   │   ├── src/
│   │   │   ├── templates/            # Report templates
│   │   │   ├── generators/           # PDF, Markdown, Confluence
│   │   │   ├── llm/                  # Claude for executive summary
│   │   │   └── main.py
│   │   └── requirements.txt
│   │
│   └── api/                          # Node.js - REST API
│       ├── src/
│       │   ├── routes/               # Endpoint handlers
│       │   ├── middleware/           # Auth, RBAC, validation
│       │   ├── db/                   # Database access layer
│       │   └── index.ts
│       └── package.json
│
├── frontend/                         # Next.js 14 Dashboard
│   ├── src/
│   │   ├── app/                      # Next.js app router
│   │   ├── components/
│   │   │   ├── timeline/
│   │   │   ├── facts-panel/
│   │   │   ├── action-items/
│   │   │   ├── conflicts/
│   │   │   ├── participants/
│   │   │   └── confirmation-modal/
│   │   ├── hooks/                    # useWebSocket, useIncidentState
│   │   ├── stores/                   # Zustand state stores
│   │   └── lib/                      # API clients
│   └── package.json
│
├── infrastructure/
│   ├── terraform/
│   │   ├── modules/
│   │   │   ├── eks/
│   │   │   ├── rds/
│   │   │   ├── kafka/
│   │   │   └── redis/
│   │   └── environments/
│   │       ├── staging/
│   │       └── production/
│   ├── helm/
│   │   └── vaic/                     # Umbrella Helm chart
│   │       ├── Chart.yaml
│   │       ├── values.yaml
│   │       └── templates/
│   └── k8s/
│       └── monitoring/               # Prometheus, Grafana, Loki configs
│
├── shared/
│   ├── schemas/                      # Shared data schemas (TypeScript + Python)
│   ├── kafka-types/                  # Kafka message type definitions
│   └── constants/                    # Shared constants
│
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   └── audio-fixtures/               # Sample audio for ASR testing
│
├── docs/
│   ├── api/                          # OpenAPI spec
│   ├── runbooks/
│   └── adr/                          # Architecture Decision Records
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── deploy-staging.yml
│       └── deploy-production.yml
│
├── docker-compose.yml                # Local development
└── Makefile                          # Common commands
```

---

## 14. Technology Stack

| Category | Technology | Rationale |
|---|---|---|
| **ASR** | OpenAI Whisper Large V3 (self-hosted) | State-of-the-art WER; runs on-premises for data residency |
| **Diarization** | pyannote.audio 3.1 | Industry-leading speaker diarization accuracy |
| **LLM** | Anthropic Claude claude-sonnet-4-6 | Best-in-class instruction following for structured JSON classification |
| **TTS** | ElevenLabs (primary) / AWS Polly (fallback) | Natural voice quality; low latency |
| **Audio Streaming** | Zoom Video SDK | Most widely adopted enterprise conference platform |
| **Message Queue** | Apache Kafka (MSK) | High-throughput, ordered event streaming; replay capability |
| **Primary Database** | PostgreSQL 15 (RDS) | ACID compliance; rich JSON support for entity storage |
| **Cache** | Redis 7 (ElastiCache) | Sub-millisecond incident state reads; Pub/Sub for WS delivery |
| **Frontend** | Next.js 14 + React 18 | App router; server components; excellent real-time WebSocket support |
| **State Management** | Zustand | Lightweight, performant React state |
| **Backend Services** | Node.js (TypeScript) | Non-blocking I/O for audio/WebSocket handling |
| **AI Services** | Python (FastAPI) | ML ecosystem compatibility; async performance |
| **Container Orchestration** | Kubernetes (EKS) | Production-grade; horizontal auto-scaling |
| **Service Mesh** | Istio | mTLS; observability; traffic management |
| **IaC** | Terraform | Cloud-agnostic; mature state management |
| **CI/CD** | GitHub Actions | Native GitHub integration; rich marketplace |
| **Monitoring** | Prometheus + Grafana | Open standard; powerful alerting |
| **Logging** | Loki + Grafana | Cost-effective; label-based querying |
| **Tracing** | Jaeger / OpenTelemetry | Distributed trace correlation across services |
| **Secrets** | HashiCorp Vault | Dynamic secrets; automatic rotation |

---

## 15. Design Patterns

| Pattern | Applied Where | Why |
|---|---|---|
| **Event Sourcing** | Incident State Manager | Immutable audit log; full state reconstruction |
| **CQRS** | State Manager API | Separate read (dashboard) and write (classification) paths |
| **Saga Pattern** | Tool Integration Gateway | Multi-step confirmation + execution with compensation |
| **Circuit Breaker** | All external API calls | Prevent cascade failures during tool outages |
| **Strangler Fig** | Tool integrations (adding new tools) | Add integrations without changing core pipeline |
| **Publisher-Subscriber** | Kafka topics | Decoupled service communication |
| **Repository Pattern** | Database access | Testable, swappable data layer |
| **Strategy Pattern** | TTS provider selection | Switch ElevenLabs ↔ Polly without code changes |
| **Chain of Responsibility** | Classification pipeline | Each stage processes then passes; easy to extend |

---

## 16. Scalability Strategy

- **Audio Ingestion:** Scale horizontally — 1 pod per active incident (isolated Kafka partition)
- **Whisper Inference:** GPU nodes auto-scale based on `audio.raw` topic lag
- **Classification Engine:** Scale based on `transcript.entries` topic consumer lag
- **State Manager:** Scale read replicas; single writer per incident (Kafka consumer group)
- **WebSocket Gateway:** Consistent hashing — all connections for an incident routed to same pod set
- **Database:** Read replicas for dashboard queries; connection pooling via PgBouncer

---

## 17. Fault Tolerance & Disaster Recovery

| Failure Scenario | Detection | Recovery |
|---|---|---|
| ASR pod crash | Kubernetes liveness probe | Pod auto-restart; Kafka offset maintained; no utterance loss |
| Claude API outage | Circuit breaker | Queue utterances; display "AI processing paused" on dashboard |
| Kafka broker failure | Kafka replication | Consumer continues from replica; RF=3 tolerates 2 broker failures |
| PostgreSQL primary failure | RDS Multi-AZ failover | Automatic failover <60s; application auto-reconnects |
| Redis failure | ElastiCache cluster mode | Failover to replica shard; state cache rebuilt from PostgreSQL |
| Zoom bot disconnect | SDK reconnect logic | Auto-rejoin within 10s; audio gap logged but processing continues |
| Full region failure | Multi-region standby (future) | Manual failover to DR region; RTO 15min |
