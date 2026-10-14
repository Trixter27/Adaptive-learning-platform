import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

// Exercise the real client under both deployment configurations without Next or credentials.
const source = await readFile(new URL("../src/lib/api.ts", import.meta.url), "utf8");
async function client(base) {
  const configured = source.replace("process.env.NEXT_PUBLIC_API_BASE_URL", JSON.stringify(base));
  const { outputText } = ts.transpileModule(configured, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
}

for (const base of ["http://127.0.0.1:8000", "/backend-api"]) {
  test(`signed binary upload preserves path, query and reserved headers through ${base}`, async (t) => {
    const { api } = await client(base);
    let called = false;
    const file = new File(["PDF bytes"], "source.pdf", { type: "application/pdf" });
    t.mock.method(globalThis, "fetch", async (url, init) => {
      called = true;
      assert.equal(url, `${base}/api/v1/uploads/local/object?expires=123&token=test`);
      assert.equal(init.method, "PUT");
      assert.equal(init.body, file);
      assert.equal(init.headers.get("content-type"), "application/pdf");
      assert.equal(init.headers.has("authorization"), false);
      return new Response(null, { status: 204 });
    });
    await api.uploadFile({ upload_url: "/api/v1/uploads/local/object?expires=123&token=test", method: "PUT", headers: { "content-type": "application/pdf" } }, file, "incorrect-browser-type");
    assert.ok(called);
  });
}

test("absolute presigned URLs are not rewritten", async (t) => {
  const { api } = await client("/backend-api");
  t.mock.method(globalThis, "fetch", async (url) => {
    assert.equal(url, "https://storage.example/upload?signature=test");
    return new Response(null, { status: 204 });
  });
  await api.uploadFile({ upload_url: "https://storage.example/upload?signature=test", method: "PUT", headers: {} }, new File(["bytes"], "source.pdf"), "application/pdf");
});

test("all five answer modes forward only the student response", async (t) => {
  const { api } = await client("/backend-api");
  const answers = [{ selected_option: 1 }, { text: "A student response" }, { value: 0 }, { matches: [1, 0] }, { order: [2, 0, 1] }];
  let index = 0;
  t.mock.method(globalThis, "fetch", async (url, init) => {
    assert.equal(url, "/backend-api/api/v1/attempts");
    assert.equal(init.method, "POST");
    assert.deepEqual(JSON.parse(init.body), { challenge_id: "challenge", answer: answers[index++], time_taken_seconds: 86400 });
    return Response.json({ correct: false, mastery_before: 0.2, mastery_after: 0.17, next_action: "remediate" });
  });
  for (const answer of answers) {
    const result = await api.submitAttempt("challenge", answer, 999999);
    assert.equal(result.mastery_after, 0.17);
  }
  assert.equal(index, 5);
});

test("duplicate attempt surfaces 409 and never retries a mutation", async (t) => {
  const { api, ApiError } = await client("/backend-api");
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    return Response.json({ error: { code: "INVALID_CHALLENGE", message: "This challenge has already been attempted. Request a new challenge." } }, { status: 409 });
  });
  await assert.rejects(api.submitAttempt("challenge", { value: 3 }, 1), (error) => error instanceof ApiError && error.status === 409 && error.message.includes("already been attempted"));
  assert.equal(calls, 1);
});

test("gateway errors and backend validation errors remain understandable", async (t) => {
  const { api } = await client("/backend-api");
  t.mock.method(globalThis, "fetch", async () => new Response("Bad Gateway", { status: 502 }));
  await assert.rejects(api.listCourses(), /API or model did not respond/);
  t.mock.method(globalThis, "fetch", async () => Response.json({ error: { code: "INVALID_UPLOAD", message: "Upload size does not match reservation." } }, { status: 422 }));
  await assert.rejects(api.completeUpload("course", "file"), /Upload size does not match reservation/);
});

test("source labels use only authoritative locations, including timestamp zero", async () => {
  const { sourceLabel } = await client("/backend-api");
  assert.equal(sourceLabel({ source_type: "pdf", page_number: 3 }), "PDF page 3");
  assert.equal(sourceLabel({ source_type: "pptx", slide_number: 2 }), "PowerPoint slide 2");
  assert.equal(sourceLabel({ source_type: "video", start_seconds: 0, end_seconds: 5 }), "Video 0s–5s");
  assert.equal(sourceLabel({ source_type: "pdf" }), "PDF");
});
