"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Play, Pause, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

interface ProductChoice {
  id: string;
  title: string;
  slug: string;
  type: string;
  status: string;
}

interface SequenceStep {
  index: number;
  subject: string;
  title?: string;
  body: string;
  delayHours: number;
}

interface EmailSequence {
  _id: string;
  name: string;
  productId: string | { _id: string; title: string; slug: string };
  active: boolean;
  totalSteps: number;
  intervalValue: number;
  intervalUnit: "hours" | "days";
  steps: SequenceStep[];
  createdAt: string;
  updatedAt: string;
}

export default function AutomationPage() {
  const [sequences, setSequences] = useState<EmailSequence[]>([]);
  const [products, setProducts] = useState<ProductChoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    productId: "",
    totalSteps: 3,
    intervalValue: 24,
    intervalUnit: "hours" as "hours" | "days",
    steps: [
      { index: 0, subject: "", title: "", body: "", delayHours: 0 },
      { index: 1, subject: "", title: "", body: "", delayHours: 24 },
      { index: 2, subject: "", title: "", body: "", delayHours: 48 },
    ],
  });
  const [openAccordions, setOpenAccordions] = useState<string[]>(["step-0"]);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [seqRes, prodRes] = await Promise.all([
        fetch("/api/admin/email-sequences"),
        fetch("/api/admin/email-sequences/options"),
      ]);
      const seqData = await seqRes.json();
      const prodData = await prodRes.json();
      if (seqData.ok) setSequences(seqData.data);
      if (prodData.ok) setProducts(prodData.data.choices ?? []);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Load once on mount; later refreshes are triggered by mutations.
    void Promise.resolve().then(fetchData);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getProductName = (productId: string | EmailSequence["productId"]) => {
    if (typeof productId === "object") return productId.title;
    const p = products.find((prod) => prod.id === productId);
    return p?.title || "Unknown Product";
  };

  const handleStepCountChange = (count: number) => {
    const newSteps = Array.from({ length: count }, (_, i) => {
      const existing = form.steps[i];
      if (existing) return existing;
      const prevDelay = form.steps[form.steps.length - 1]?.delayHours || 0;
      return {
        index: i,
        subject: "",
        title: "",
        body: "",
        delayHours: prevDelay + (form.intervalUnit === "days" ? form.intervalValue * 24 : form.intervalValue),
      };
    }).map((step, i) => ({ ...step, index: i }));
    setForm({ ...form, totalSteps: count, steps: newSteps });
    setOpenAccordions(Array.from({ length: count }, (_, i) => `step-${i}`));
  };

  const handleStepChange = (index: number, field: string, value: unknown) => {
    const steps = [...form.steps];
    (steps[index] as Record<string, unknown>)[field] = value;
    setForm({ ...form, steps });
  };

  const handleIntervalChange = (value: number, unit: "hours" | "days") => {
    setForm({ ...form, intervalValue: value, intervalUnit: unit });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId ? `/api/admin/email-sequences/${editingId}` : "/api/admin/email-sequences";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.ok) {
        setShowForm(false);
        setEditingId(null);
        setForm({
          name: "",
          productId: "",
          totalSteps: 3,
          intervalValue: 24,
          intervalUnit: "hours",
          steps: [
            { index: 0, subject: "", title: "", body: "", delayHours: 0 },
            { index: 1, subject: "", title: "", body: "", delayHours: 24 },
            { index: 2, subject: "", title: "", body: "", delayHours: 48 },
          ],
        });
        fetchData();
      }
    } catch (err) {
      console.error("Error saving sequence:", err);
    }
  };

  const handleEdit = (seq: EmailSequence) => {
    setEditingId(seq._id);
    setForm({
      name: seq.name,
      productId: typeof seq.productId === "object" ? seq.productId._id : seq.productId,
      totalSteps: seq.totalSteps,
      intervalValue: seq.intervalValue,
      intervalUnit: seq.intervalUnit,
      steps: seq.steps.map((s) => ({
        index: s.index,
        subject: s.subject,
        title: s.title || "",
        body: s.body,
        delayHours: s.delayHours,
      })),
    });
    setShowForm(true);
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      await fetch(`/api/admin/email-sequences/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !active }),
      });
      fetchData();
    } catch (err) {
      console.error("Error toggling sequence:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this sequence?")) return;
    try {
      await fetch(`/api/admin/email-sequences/${id}`, {
        method: "DELETE",
      });
      fetchData();
    } catch (err) {
      console.error("Error deleting sequence:", err);
    }
  };

  const handleRunNow = async () => {
    setRunning(true);
    setRunResult(null);
    try {
      const res = await fetch("/api/admin/email-sequences/dispatch", {
        method: "POST",
      });
      const data = await res.json();
      if (data.ok) {
        const { processed, sent, failed } = data.data;
        setRunResult(`Processed ${processed} · sent ${sent} · failed ${failed}`);
      } else {
        setRunResult("Dispatch failed");
      }
    } catch {
      setRunResult("Dispatch failed");
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-enter space-y-8 p-6">
        <div className="h-8 bg-neutral-200 rounded animate-pulse" />
        <div className="h-32 bg-neutral-200 rounded animate-pulse" />
      </div>
    );
  }
  return (
    <div className="admin-enter space-y-8 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-950">
            Automation & Sequences
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Timed, multi-step email sequences triggered by customer actions.
          </p>
        </div>
        {!showForm && (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={handleRunNow}
              disabled={running}
            >
              <Send className="h-4 w-4 mr-2" />
              {running ? "Running..." : "Run now"}
            </Button>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Sequence
            </Button>
          </div>
        )}
      </div>

      {runResult && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
          {runResult}
        </div>
      )}

      {showForm ? (
        <div className="rounded-[20px] border border-neutral-300 bg-white p-6">
          <h2 className="text-lg font-semibold mb-6">
            {editingId ? "Edit Sequence" : "Create New Sequence"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Sequence Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Course/Product</label>
                <select
                  value={form.productId}
                  onChange={(e) => setForm({ ...form, productId: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                  required
                >
                  <option value="">
                    {products.length ? "Select a product..." : "No products available"}
                  </option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                      {p.type && p.type !== "COURSE" ? ` (${p.type})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Number of Emails</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={form.totalSteps}
                  onChange={(e) => handleStepCountChange(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Send Every</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    value={form.intervalValue}
                    onChange={(e) => handleIntervalChange(parseInt(e.target.value) || 1, form.intervalUnit)}
                    className="w-24 px-3 py-2 border border-neutral-300 rounded-lg"
                  />
                  <select
                    value={form.intervalUnit}
                    onChange={(e) => handleIntervalChange(form.intervalValue, e.target.value as "hours" | "days")}
                    className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg"
                  >
                    <option value="hours">Hour(s)</option>
                    <option value="days">Day(s)</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-4">Email Sequence</label>
              <Accordion className="space-y-4">
                {form.steps.map((step, idx) => {
                  const open = openAccordions.includes(`step-${idx}`);
                  return (
                    <AccordionItem key={idx} value={`step-${idx}`} open={open}>
                      <AccordionTrigger
                        isOpen={open}
                        onClick={() => {
                          setOpenAccordions((prev) =>
                            prev.includes(`step-${idx}`)
                              ? prev.filter((v) => v !== `step-${idx}`)
                              : [...prev, `step-${idx}`]
                          );
                        }}
                      >
                        Email {idx + 1}
                      </AccordionTrigger>
                      <AccordionContent isOpen={open} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Subject</label>
                        <input
                          type="text"
                          value={step.subject}
                          onChange={(e) => handleStepChange(idx, "subject", e.target.value)}
                          className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                          placeholder="Email subject"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Title (Optional)</label>
                        <input
                          type="text"
                          value={step.title}
                          onChange={(e) => handleStepChange(idx, "title", e.target.value)}
                          className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                          placeholder="Pre-header/title"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Delay (hours from start)</label>
                        <input
                          type="number"
                          min="0"
                          value={step.delayHours}
                          onChange={(e) => handleStepChange(idx, "delayHours", parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                        />
                        <p className="text-xs text-neutral-500 mt-1">
                          When to send this email (0 for immediately after trigger)
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Body</label>
                        <RichTextEditor
                          value={step.body}
                          onChange={(value) => handleStepChange(idx, "body", value)}
                          placeholder="Write your email content..."
                          minHeight="min-h-[200px]"
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );})}
              </Accordion>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit">{editingId ? "Update" : "Create"} Sequence</Button>
            </div>
          </form>
        </div>
      ) : (
        <div className="space-y-4">
          {sequences.length === 0 ? (
            <div className="rounded-[20px] border border-neutral-300 bg-white p-6">
              <EmptyState
                title="No sequences yet"
                description="Create your first email sequence to automate follow-ups for your products."
              />
            </div>
          ) : (
            sequences.map((seq) => (
              <div key={seq._id} className="rounded-[20px] border border-neutral-300 bg-white p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{seq.name}</h3>
                    <p className="text-sm text-neutral-500 mt-1">
                      Product: {getProductName(seq.productId)} • {seq.totalSteps} emails • Every {seq.intervalValue} {seq.intervalUnit}
                    </p>
                    <div className="mt-2">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          seq.active
                            ? "bg-green-100 text-green-700"
                            : "bg-neutral-100 text-neutral-700"
                        }`}
                      >
                        {seq.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(seq._id, seq.active)}
                    >
                      {seq.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(seq)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(seq._id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
