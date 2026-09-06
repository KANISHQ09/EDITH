# EDITH: Voice AI Incident Commander — Complete Product Demo Video Script

**Target Duration:** ~7–9 Minutes (adaptable for a fast 5-minute pitch or a comprehensive 10-minute deep-dive)  
**Speaker Tone:** Confident, articulate, modern engineering-founder vibe (crisp, technical yet accessible, authoritative)  
**Format:** Multi-column layout with **Timestamp**, **Visual / Screen Action** (what to show/click), and **Spoken Script** (verbatim voiceover), along with **Pro-Tips** for delivery.

---

## Executive Overview & Quick Reference

| Act | Focus | Estimated Time | Key Highlight |
|---|---|---|---|
| **Act 1** | **The Hook & Problem Statement** | 0:00 – 1:20 | The 3:00 AM P1 outage chaos, cognitive overload, lost context |
| **Act 2** | **The Solution: Introducing EDITH** | 1:20 – 2:20 | What EDITH is: Voice AI Co-Pilot for live war rooms |
| **Act 3** | **Command Console & Incident Declaration** | 2:20 – 3:30 | Sleek Studio Landing, 3D Voice Orb, Declaring a P1 incident |
| **Act 4** | **The Live War Room Experience (Core)** | 3:30 – 6:15 | WebRTC Voice, Live Classification, Conflict Detection, Spoken Briefings |
| **Act 5** | **Integrations & Human-in-the-Loop Gate** | 6:15 – 7:15 | Jira/Slack syncing, Safety Confirmation Gates |
| **Act 6** | **Resolution & Automated Post-Mortem** | 7:15 – 8:15 | Instant Markdown RCA, Timeline, MTTR calculation |
| **Act 7** | **Conclusion & Call to Action** | 8:15 – 8:45 | Value recap, mission statement, closing |

---

## ACT 1: The Problem Statement (0:00 – 1:20)
*Goal: Hook the viewer immediately by speaking to every engineer's visceral nightmare: an unorganized, high-stakes production outage.*

| Time | Visual / Screen Action | Spoken Script (Voiceover) |
|---|---|---|
| **0:00 – 0:25** | **B-Roll / Title Slide or Dark Terminal Visual**<br>Screen opens with a high-contrast title card: **"EDITH: Voice AI Incident Commander"** or a montage of alerting screens (PagerDuty alert, Slack barrage, Grafana spike). | "It’s 3:14 AM. Your phone buzzes with a high-severity P1 alert: payment services are throwing 500s across three regions. Within five minutes, there are fifteen engineers on a chaotic video call, three separate Slack threads pinging simultaneously, and Grafana dashboards flashing red." |
| **0:25 – 0:50** | **Show PRD / Problem Matrix Slide or Split Screen**<br>Highlighting: *Cognitive Overload, Missing Scribe, Information Divergence, Untracked Actions.* | "In that moment, your engineering team faces a critical challenge that software tooling has ignored for decades: **the cognitive chaos of live incident response**.<br><br>The Incident Commander is frantically trying to coordinate while simultaneously typing notes. Engineers are talking over each other with unverified assumptions. Key hypotheses get lost in the noise, critical action items go unassigned, and nobody agrees on what is a verified fact versus what is speculation." |
| **0:50 – 1:20** | **Visual of MTTR clock ticking up**<br>Show metrics: MTTR creeping up, post-incident RCA notes scattered across Slack and memory. | "When stakeholders or executives join the room asking for a status update, the entire technical troubleshooting halts just to repeat what happened ten minutes ago.<br><br>The outcome? **Bloated MTTR, exhausted responders, dangerous decision blind spots, and post-mortems reconstructed from flawed human memory.**<br><br>We asked ourselves: *What if every engineering war room had an elite, autonomous AI co-pilot listening in real time, structuring the chaos, and keeping the entire team aligned?*" |

---

## ACT 2: The Solution — Meet EDITH (1:20 – 2:20)
*Goal: Reveal EDITH with high energy, clarifying its mission and core architecture.*

| Time | Visual / Screen Action | Spoken Script (Voiceover) |
|---|---|---|
| **1:20 – 1:45** | **Camera transitions to EDITH Web Interface**<br>Landing page appears. Clean, dark-mode Swiss aesthetic with subtle purple/cobalt glows. The title reads: **"EDITH — Even In Downtime, I'll Triage Hazards."** | "Meet **EDITH** — the **Voice AI Incident Commander**.<br><br>EDITH is an autonomous, voice-aware AI co-pilot designed specifically for live incident war rooms. EDITH doesn't replace the human Incident Commander; it amplifies them. It acts as an omnipresent tactical co-investigator embedded directly on the voice bridge." |
| **1:45 – 2:20** | **Hover over Feature Highlights on Landing Page**<br>Point to: Real-Time Audio Diarization, LLM Intelligence Extraction, Conflict Detection, Spoken Synthesized Briefings, Human-in-the-Loop Safeguards. | "Under the hood, EDITH connects to your live conference audio—whether via WebRTC, Zoom, or Google Meet. With sub-second latency, it performs automatic speech recognition and speaker diarization to identify who is speaking.<br><br>Next, our specialized intelligence engine processes every utterance in real time, categorizing raw speech into **Confirmed Facts, Working Hypotheses, Decisions, Action Items, and Critical Questions**.<br><br>It actively listens for conflicting statements, tracks action item owners, syncs with Jira and PagerDuty, and can even speak executive briefings aloud. Let’s look at how it works in action." |

---

## ACT 3: The Command Console & Declaring an Incident (2:20 – 3:30)
*Goal: Walk through the landing UI, telemetry integration, and launch a real incident scenario.*

| Time | Visual / Screen Action | Spoken Script (Voiceover) |
|---|---|---|
| **2:20 – 2:45** | **Landing Page: 3D Voice Orb**<br>Scroll into the Hero section. Click on the interactive 3D Voice Orb. EDITH’s audio intro plays: *'Hello. I am EDITH... Monitoring microservice clusters. Standing by for incident command directive.'* | "Here on the EDITH Command Console, you see our real-time telemetry grid and our responsive 3D AI Voice Orb. Engineers can immediately test voice profiles and verify audio pipelines before entering an outage bridge." |
| **2:45 – 3:05** | **Scroll through Integrations & Architecture**<br>Quick showcase of integrations: PagerDuty cascade suppression, Datadog APM tracing, Kubernetes pod logs, Slack channel mirroring. | "EDITH natively hooks into your production toolchain—PagerDuty, Kubernetes, Datadog, Slack, and AWS CloudWatch. When an alert fires, EDITH automatically correlates p99 latencies and pod crash loops before responders even join the bridge." |
| **3:05 – 3:30** | **Click '+ DECLARE INCIDENT' button**<br>Modal pops up. Fill out fields:<br>• **Title:** `Payment Service 500 Errors & DB Replica Lag`<br>• **Severity:** `P1 - Critical`<br>• **Affected Systems:** `checkout-api, postgres-replica-02, stripe-webhook`<br>• Click **'Assemble War Room'**. | "Let’s spin up a live incident. We click **Declare Incident**. We select **P1 Critical**, name the incident `Payment Service 500 Errors and DB Replica Lag`, flag the affected microservices, and click **Assemble War Room**.<br><br>Immediately, EDITH provisions our secure real-time room, spins up our WebRTC audio bridge, and connects our intelligence pipelines." |

---

## ACT 4: The Live War Room Experience (3:30 – 6:15)
*Goal: The centerpiece of the demo. Showcase live voice interaction, real-time extraction, conflict detection, and voice query.*

| Time | Visual / Screen Action | Spoken Script (Voiceover) |
|---|---|---|
| **3:30 – 4:00** | **War Room UI Overview**<br>Show the layout: Top KPI bar, Video/Audio participant tiles, Center EDITH AI Core card, Bottom meeting controls, Right drawer icon buttons. | "Welcome inside the **EDITH Live War Room**.<br><br>Across the top, the Incident Commander has a real-time situational HUD showing incident severity, elapsed time, confirmed facts, active hypotheses, and pending actions.<br><br>In the center, we have our live conference bridge powered by Agora WebRTC, complete with active speaker detection, volume metering, and the central **EDITH Tactical HUD**." |
| **4:00 – 4:35** | **Open Drawer 1: Live Transcripts**<br>Speak into your mic: *'Alex here. I’m seeing HTTP 504 gateway timeouts on the checkout-service since the 14:15 deployment.'*<br>Watch the transcript appear in real-time with badge `FACT` and speaker label `Alex`. | "Watch what happens when responders speak. I'll speak naturally as the Incident Commander:<br><br>*(Deliver spoken utterance into mic)*: *'Alex here. I’m seeing HTTP 504 gateway timeouts on the checkout-service since the 14:15 deployment.'*<br><br>Within milliseconds, EDITH transcribes the audio, attributes the speech to me, and our NLP engine tags it as a **Confirmed Fact**. No human scribe needed." |
| **4:35 – 5:05** | **Open Drawer 2: Intelligence Panels (Facts & Hypotheses)**<br>Click over to the **Hypotheses** & **Facts** tabs. Show how the statement is automatically organized into structured knowledge cards with confidence ratings. | "Over in the Intelligence drawer, our conversation is dynamically structured into discrete knowledge assets.<br><br>Here in **Confirmed Facts**, the deployment timestamp and error codes are locked. Below, in **Active Hypotheses**, when an engineer suggests *'Maybe the database connection pool is exhausted'*, EDITH registers it as an unverified hypothesis under active investigation, preventing the team from mistaking an assumption for ground truth." |
| **5:05 – 5:35** | **Showcase Conflict Detection in Action**<br>Simulate or show Drawer 4 (Conflicts).<br>Show conflict card: *'Speaker A states DB replica is healthy; Speaker B reports replication lag exceeds 400 seconds.'* | "Now, one of EDITH’s most powerful differentiators: **Automated Conflict & Gap Detection**.<br><br>In the fog of an outage, engineer Dave might say the database replica is healthy, while thirty seconds later, engineer Sarah notes that replication lag is spiking past seven minutes.<br><br>EDITH flags this semantic contradiction instantly in red, alerting the Incident Commander: *'Conflict Detected: Incompatible DB health assessments.'* This eliminates dangerous blind spots before flawed decisions are executed." |
| **5:35 – 6:15** | **Feature Showcase: Talking Directly to EDITH (Voice Interaction)**<br>Click **'Talk to EDITH'** (or ask query modal). Speak aloud: *'EDITH, what are our current open action items and who owns them?'*<br>EDITH's 3D Orb pulses, processes, and speaks back via Text-to-Speech: *'There are 2 open action items: Dave is inspecting pod memory limits, and Sarah is verifying read replica lag.'* | "Responders can also interact directly with EDITH using natural voice. Watch this:<br><br>*(Click 'Talk to EDITH' and speak)*: **'EDITH, what are our current open action items and who owns them?'**<br><br>*(EDITH speaks response aloud)*<br><br>Notice that EDITH synthesized a concise, tactical answer and spoke it back on the voice bridge. Anyone can also trigger a **15-minute Executive Situation Briefing** on demand, allowing engineering directors who just joined the call to get up to speed in twenty seconds without interrupting anyone." |

---

## ACT 5: Operational Integrations & Human-in-the-Loop Safety (6:15 – 7:15)
*Goal: Demonstrate that EDITH bridges communication to external tools while strictly enforcing human safety controls.*

| Time | Visual / Screen Action | Spoken Script (Voiceover) |
|---|---|---|
| **6:15 – 6:45** | **Open Action Items Drawer & Tool Actions**<br>Show Action Item: *'Roll back deployment to release v2.4.1'*. Click **'Dispatch to Jira / Slack'**. | "Incident intelligence is useless if it stays trapped in the meeting. In the Action Items panel, tasks extracted from voice are tracked with owners and status toggles.<br><br>With one click, EDITH can dispatch Jira tickets, post live status updates to the customer's `#incident-room` Slack channel, or acknowledge PagerDuty alerts." |
| **6:45 – 7:15** | **Trigger Confirmation Gate Modal**<br>A confirmation modal pops up with high-visibility warning: *'Confirm Action: Trigger rollback of checkout-api to v2.4.1 in Kubernetes prod-cluster-us-east?'*<br>Click **'Confirm & Execute'**. | "Critically, EDITH operates under a strict **Human-in-the-Loop Confirmation Gate**.<br><br>EDITH will *never* unilaterally touch production infrastructure or trigger paging escalations without human consensus. When a remediation action is suggested, EDITH presents an explicit confirmation card to the Incident Commander. Once confirmed, the action executes with full audit logging." |

---

## ACT 6: Incident Resolution & Instant Post-Mortem (7:15 – 8:15)
*Goal: Showcase the magic moment when the incident is resolved and the automated RCA is generated in seconds.*

| Time | Visual / Screen Action | Spoken Script (Voiceover) |
|---|---|---|
| **7:15 – 7:40** | **Click 'Declare Resolved' in the War Room Header**<br>Confirmation modal asks to mark incident resolved. Click **'Confirm Resolution'**.<br>The status pill switches to green: `RESOLVED`. MTTR stops ticking. | "The fix is applied, telemetry stabilizes, and the Incident Commander clicks **Declare Resolved**.<br><br>Traditionally, this is where the most dreaded engineering chore begins: spending three hours combing through messy Slack logs and call recordings to write a post-mortem." |
| **7:40 – 8:15** | **Report Modal Opens automatically (or click 'View Report')**<br>Display the rich, beautifully structured Markdown **Incident Summary Report (ISR)**.<br>Scroll through: Executive Summary, Chronological Timeline with exact timestamps, Root Cause Analysis, Actions Taken, and Unresolved Follow-Up Risks. | "With EDITH, the post-mortem is already done.<br><br>Within seconds, our Report Generation Service compiles a comprehensive **Incident Summary Report**.<br><br>Look at the detail: an executive summary, calculated MTTD and MTTR, a minute-by-minute verified chronological timeline, attributed root cause analysis, completed actions, and explicit open technical debt items to prevent recurrence. You can export this directly to Confluence, Notion, or Markdown with a single click." |

---

## ACT 7: Conclusion & Call to Action (8:15 – 8:45)
*Goal: Close with strong impact, summarizing the ROI and next steps.*

| Time | Visual / Screen Action | Spoken Script (Voiceover) |
|---|---|---|
| **8:15 – 8:45** | **Transition back to Landing Page / Hero Visual**<br>Show the EDITH logo, GitHub / deployment URL, and team contact details. | "In summary, EDITH transforms high-stress incident response from frantic, disjointed chaos into a structured, coordinated, and automated workflow.<br><br>By listening, classifying intelligence, spotting contradictions, and generating instant post-mortems, EDITH cuts MTTR in half and lets your engineers focus on what truly matters: fixing the problem.<br><br>Thank you for watching the demo. Experience EDITH today and bring autonomous AI intelligence to your incident war rooms." |

---

## Tips for Recording the Video

1. **Audio Setup:**
   - Use a clean microphone with noise cancellation.
   - Speak in a calm, decisive, and steady pace (around 130–140 words per minute).
2. **Browser Window:**
   - Set browser zoom to 100% or 110% on a standard 1080p or 1440p resolution for maximum text crispness.
   - Close distracting browser tabs and mute OS notification sounds.
3. **Pacing with EDITH's Voice:**
   - When triggering EDITH's voice response or playing the 3D Orb intro, pause for 1 second before and after so the viewer can clearly hear EDITH's voice without talking over it.
4. **Mouse Movements:**
   - Move your cursor deliberately. Hover over key badges (`FACT`, `HYPOTHESIS`, `CONFLICT`) for a second to draw the viewer's eye before clicking.
