# Unified Multi-MCP Agent Workflow: Single Prompt Multi-Platform Orchestration

This document illustrates how **Claude** operates as a **Unified Agent** controlling multiple Model Context Protocol (MCP) servers simultaneously to update **Vercel**, **Render**, and **MongoDB Atlas** in a **single prompt**.

---

## 1. Unified Architecture Diagram

```
                     +---------------------------------------+
                     |           USER SINGLE PROMPT          |
                     |  "Claude, update schema to sem 12,    |
                     |   repoint backend to MongoDB Atlas,   |
                     |   and deploy Vercel + Render now"     |
                     +---------------------------------------+
                                         |
                                         v
                     +---------------------------------------+
                     |       CLAUDE (UNIFIED MCP AGENT)      |
                     |      Orchestrates 4 Tool Endpoints    |
                     +---------------------------------------+
                                  /      |      \
               +-----------------+       |       +-----------------+
               |                         |                         |
               v                         v                         v
     +-------------------+     +-------------------+     +-------------------+
     |    VERCEL MCP     |     |    RENDER MCP     |     |   MONGODB ATLAS   |
     |     (Tier 1)      |     |     (Tier 2)      |     |     (Tier 3)      |
     +-------------------+     +-------------------+     +-------------------+
     | • Set Env Vars    |     | • Set MONGODB_URI |     | • Sanitize URI    |
     | • Deploy Frontend |     | • Trigger Deploy  |     | • Whitelist IP    |
     | • Verify Routing  |     | • Inspect Logs    |     | • Validate Schema |
     +-------------------+     +-------------------+     +-------------------+
```

---

## 2. Setting Up Claude Desktop Configuration

Add the following to your Claude Desktop configuration file:
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "unified-cloud-orchestrator": {
      "command": "node",
      "args": [
        "C:\\Users\\DELL\\.gemini\\antigravity\\scratch\\three-tier-student-system\\mcp-unified-agent\\unified-orchestrator.js"
      ],
      "env": {
        "VERCEL_API_TOKEN": "YOUR_VERCEL_TOKEN",
        "VERCEL_PROJECT_ID": "prj_xxxxxxx",
        "RENDER_API_KEY": "rnd_xxxxxxx",
        "RENDER_SERVICE_ID": "srv-xxxxxxx"
      }
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_xxxxxxxxxxxx"
      }
    },
    "mongodb-atlas": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-mongodb"],
      "env": {
        "MONGODB_URI": "mongodb+srv://studentAdmin:yourSecurePassword123@cluster0.abcde.mongodb.net/studentDB?retryWrites=true&w=majority"
      }
    }
  }
}
```

---

## 3. The "Single Prompt Multi-Platform" Demonstration

### User Prompt:
> *"Claude: Connect my student system to my Atlas URI `mongodb+srv://studentAdmin:p@ss#word123@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority`, configure the Render backend with this URI and set FRONTEND_URL to my Vercel site `https://student-system.vercel.app`, configure the Vercel frontend to point to `https://student-backend.onrender.com`, and trigger deployments across both platforms."*

### Claude's Autonomous Multi-Platform Execution:
In response to this **single prompt**, Claude invokes the unified tools in sequence without stopping:

1. **Step 1 (MongoDB URI Healing)**:
   Claude calls `solve_mongo_uri_issue`:
   - Detects special characters `@` and `#` in `p@ss#word123` -> URL-encodes to `p%40ss%23word123`.
   - Detects missing database name -> Appends `/studentDB`.
   - Injects DNS fallback (`8.8.8.8`) to avoid Render container `querySrv ECONNREFUSED`.

2. **Step 2 (Render Application Tier Update)**:
   Claude calls `update_multiple_platforms_in_one_prompt` for Render:
   - Sets `MONGODB_URI = mongodb+srv://studentAdmin:p%40ss%23word123@cluster0.abcde.mongodb.net/studentDB?retryWrites=true&w=majority`
   - Sets `FRONTEND_URL = https://student-system.vercel.app`
   - Triggers clean backend rebuild on Render.

3. **Step 3 (Vercel Presentation Tier Update)**:
   Claude calls `update_multiple_platforms_in_one_prompt` for Vercel:
   - Sets `NEXT_PUBLIC_API_URL` or static config to `https://student-backend.onrender.com`
   - Triggers production deployment on Vercel.

4. **Step 4 (Verification & Health Check)**:
   Claude calls `check_three_tier_status`:
   - Pings Render `/api/health` -> confirms database status `Connected` (`readyState: 1`) to `studentDB`.
   - Confirms Vercel deployment URL returns HTTP 200.

All 4 actions occur within **ONE conversational turn**.
