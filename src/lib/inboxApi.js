export async function fetchInbox() {
  const response = await fetch("/api/inbox");
  if (!response.ok) throw new Error(`inbox unavailable: ${response.status}`);
  return response.json();
}

export async function addResource(resource) {
  const response = await fetch("/api/resources", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(resource),
  });
  if (!response.ok) throw new Error(`resource add failed: ${response.status}`);
  return response.json();
}

export async function updateResource(id, patch) {
  const response = await fetch(`/api/resources/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) throw new Error(`resource update failed: ${response.status}`);
  return response.json();
}

export async function deleteResource(id) {
  const response = await fetch(`/api/resources/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!response.ok) throw new Error(`resource delete failed: ${response.status}`);
  return response.json();
}

export async function addSocialPost(post) {
  const response = await fetch("/api/social-posts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(post),
  });
  if (!response.ok) throw new Error(`post add failed: ${response.status}`);
  return response.json();
}

export async function updateSocialPost(id, patch) {
  const response = await fetch(`/api/social-posts/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) throw new Error(`post update failed: ${response.status}`);
  return response.json();
}
