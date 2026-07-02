export const connectorActionSurfaces = {
  content: {
    eyebrow: "Asset connectors",
    title: "Generate in the backyard",
    copy: "Use these provider tools when a brief needs visuals, source search, or package assets. Publish still stays manual.",
    actions: [
      { connectorId: "huggingface", connector: "Hugging Face", tool: "hf_doc_search", label: "Search HF docs", detail: "Provider docs and model context" },
      { connectorId: "huggingface", connector: "Hugging Face", tool: "space_search", label: "Find Spaces", detail: "Open-source asset workflows" },
      { connectorId: "higgsfield", connector: "Higgsfield", tool: "generate_image", label: "Generate image", detail: "Premium still for reels and carousels" },
      { connectorId: "higgsfield", connector: "Higgsfield", tool: "generate_video", label: "Generate video", detail: "Short-form cinematic media" },
      { connectorId: "google-drive", connector: "Google Drive", tool: "list_recent_files", label: "Pull references", detail: "Recent docs and screenshots" },
    ],
  },
  signals: {
    eyebrow: "Signal capture tools",
    title: "Turn inbox and files into action fuel",
    copy: "Use these tools to pull buyer clues, source artifacts, and calendar context into Horizon before making content or outreach.",
    actions: [
      { connectorId: "gmail", connector: "Gmail", tool: "search_threads", label: "Search threads", detail: "Buyer replies and operational blockers" },
      { connectorId: "gmail", connector: "Gmail", tool: "create_draft", label: "Draft outreach", detail: "Manual-review email drafts" },
      { connectorId: "google-drive", connector: "Google Drive", tool: "list_recent_files", label: "Recent files", detail: "Docs, screenshots, exports" },
      { connectorId: "google-calendar", connector: "Google Calendar", tool: "list_events", label: "Upcoming events", detail: "Commitments and publishing windows" },
    ],
  },
  command: {
    eyebrow: "Execution tools",
    title: "Agent and repo actions",
    copy: "Use these when a queued task needs an external executor or a connected work surface.",
    actions: [
      { connectorId: "jules", connector: "Jules", tool: "create_session", label: "Dispatch repo work", detail: "Async implementation session" },
      { connectorId: "google-drive", connector: "Google Drive", tool: "create_file", label: "Create artifact", detail: "Docs and generated packages" },
      { connectorId: "gmail", connector: "Gmail", tool: "create_draft", label: "Draft follow-up", detail: "Manual send only" },
    ],
  },
};
