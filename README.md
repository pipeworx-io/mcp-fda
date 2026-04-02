# mcp-fda

MCP server for FDA drug events, drug labels, and food recalls via [openFDA API](https://open.fda.gov). No authentication required.

## Tools

| Tool | Description |
|------|-------------|
| `search_drug_events` | Search FDA adverse drug event (FAERS) reports |
| `search_drug_labels` | Search FDA drug labeling / package inserts |
| `search_food_recalls` | Search FDA food enforcement / recall records |

## Quickstart via Pipeworx Gateway

Call any tool through the hosted gateway with zero setup:

```bash
curl -X POST https://gateway.pipeworx.io/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "fda_search_drug_labels",
      "arguments": { "query": "ibuprofen", "limit": 3 }
    }
  }'
```

## License

MIT
