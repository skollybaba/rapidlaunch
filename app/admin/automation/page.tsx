"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Play, Pause, Send, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { SequenceCustomersDialog } from "@/components/admin/automation/sequence-customers-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { RichTextEditor } from "@/components/admin/rich-text-editor";

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
  triggerType: "immediate" | "after_hours";
  delayHours: number;
  sendAtHours: number;
}

interface EmailSequence {
  _id: string;
  name: string;
  productId: string | { _id: string; title: string; slug: string };
  active: boolean;
  totalSteps: number;
  steps: SequenceStep[];
  subscriberCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface SequenceForm {
  name: string;
  productId: string;
  totalSteps: number;
  steps: SequenceStep[];
}

export default function AutomationPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [sequences, setSequences] = useState<EmailSequence[]>([]);
  const [products, setProducts] = useState<ProductChoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingCustomers, setViewingCustomers] = useState<{
    _id: string;
    name: string;
  } | null>(null);

  const [form, setForm] = useState<SequenceForm>({
    name: "",
    productId: "",
    totalSteps: 3,
    steps: [
      { index: 0, subject: "", title: "", body: "", triggerType: "immediate", delayHours: 0, sendAtHours: 0 },
      { index: 1, subject: "", title: "", body: "", triggerType: "after_hours", delayHours: 24, sendAtHours: 24 },
      { index: 2, subject: "", title: "", body: "", triggerType: "after_hours", delayHours: 48, sendAtHours: 48 },
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

  const emptySteps = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
      index: i,
      subject: "",
      title: "",
      body: "",
      triggerType: (i === 0 ? "immediate" : "after_hours") as "immediate" | "after_hours",
      delayHours: i * 24,
      sendAtHours: i * 24,
    }));

  const handleStepCountChange = (count: number) => {
    const newSteps = Array.from({ length: count }, (_, i) => {
      const existing = form.steps[i] as SequenceStep | undefined;
      if (existing) {
        return {
          ...existing,
          index: i,
          triggerType: existing.triggerType || (i === 0 ? "immediate" : "after_hours"),
          sendAtHours: existing.sendAtHours ?? existing.delayHours ?? 0,
        };
      }
      return emptySteps(count)[i];
    });
    setForm({ ...form, totalSteps: count, steps: newSteps });
    setOpenAccordions(Array.from({ length: count }, (_, i) => `step-${i}`));
  };

  const handleStepChange = (index: number, field: keyof SequenceStep, value: unknown) => {
    const steps = [...form.steps];
    steps[index] = { ...steps[index], [field]: value } as SequenceStep;
    setForm({ ...form, steps });
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
          steps: emptySteps(3),
        });
        fetchData();
        toast.success({
          title: editingId ? "Sequence updated" : "Sequence created",
          description: `"${form.name}" was saved successfully.`,
        });
      } else {
        toast.error({
          title: "Save failed",
          description: data.error?.message ?? "The sequence could not be saved.",
        });
      }
    } catch (err) {
      console.error("Error saving sequence:", err);
      toast.error({
        title: "Save failed",
        description: "Unexpected error while saving the sequence.",
      });
    }
  };

  const handleEdit = (seq: EmailSequence) => {
    setEditingId(seq._id);
    setForm({
      name: seq.name,
      productId: typeof seq.productId === "object" ? seq.productId._id : seq.productId,
      totalSteps: seq.totalSteps,
      
      
      steps: seq.steps.map((s) => ({
        index: s.index,
        subject: s.subject,
        title: s.title || "",
        body: s.body,
        triggerType: s.triggerType || "after_hours",
        delayHours: s.delayHours,
        sendAtHours: s.sendAtHours ?? s.delayHours,
      })),
    });
    setShowForm(true);
  };

  const handleToggleActive = async (seq: EmailSequence) => {
    const nextActive = !seq.active;
    try {
      const res = await fetch(`/api/admin/email-sequences/${seq._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: nextActive }),
      });
      const data = await res.json();
      if (data.ok) {
        fetchData();
        toast.success({
          title: nextActive ? "Automation is turned on" : "Automation is turned off",
          description: nextActive
            ? `"${seq.name}" will now email new subscribers.`
            : `"${seq.name}" is paused; no new sequence emails will be sent.`,
        });
      } else {
        toast.error({
          title: "Something went wrong",
          description: data.error?.message ?? "The sequence could not be updated.",
        });
      }
    } catch (err) {
      console.error("Error toggling sequence:", err);
      toast.error({
        title: "Something went wrong",
        description: "Unexpected error while updating the sequence.",
      });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      const ok = await confirm({
        title: `Delete "${name}"?`,
        description:
          "Existing subscribers will stop receiving this sequence. This cannot be undone.",
        confirmLabel: "Delete sequence",
        tone: "danger",
      });
      if (!ok) return;
      const res = await fetch(`/api/admin/email-sequences/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.ok) {
        fetchData();
        toast.success({
          title: "Sequence deleted",
          description: `"${name}" was deleted.`,
        });
      } else {
        toast.error({
          title: "Delete failed",
          description: data.error?.message ?? "The sequence could not be deleted.",
        });
      }
    } catch (err) {
      console.error("Error deleting sequence:", err);
      toast.error({
        title: "Delete failed",
        description: "Unexpected error while deleting the sequence.",
      });
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
                        <p className="text-xs text-neutral-500 mt-1">
                          Personalize with {"{{first_name}}"}, {"{{name}}"} or {"{{email}}"} —
                          for example, Hello {"{{first_name}}"}
                        </p>
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
                        <label className="block text-sm font-medium mb-2">Send this email at</label>
                        <select
                          value={step.triggerType || "after_hours"}
                          onChange={(e) => {
                            const t = e.target.value as "immediate" | "after_hours";
                            setForm((f) => ({
                              ...f,
                              steps: f.steps.map((s, si) =>
                                si === idx
                                  ? {
                                      ...s,
                                      triggerType: t,
                                      sendAtHours: t === "immediate" ? 0 : s.sendAtHours || s.delayHours || 0,
                                      delayHours: t === "immediate" ? 0 : s.sendAtHours || s.delayHours || 0,
                                    }
                                  : s
                              ),
                            }));
                          }}
                          className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                        >
                          <option value="immediate">Immediately when user subscribes</option>
                          <option value="after_hours">After specific hours since subscription</option>
                        </select>
                        {step.triggerType === "after_hours" && (
                          <div className="mt-2 flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              value={step.sendAtHours ?? step.delayHours ?? 0}
                              onChange={(e) => {
                                const v = parseInt(e.target.value) || 0;
                                setForm((f) => ({
                                  ...f,
                                  steps: f.steps.map((s, si) =>
                                    si === idx ? { ...s, sendAtHours: v, delayHours: v } : s
                                  ),
                                }));
                              }}
                              className="w-24 px-3 py-2 border border-neutral-300 rounded-lg"
                            />
                            <span className="text-sm text-neutral-500">hours after subscription</span>
                          </div>
                        )}
                        <p className="text-xs text-neutral-500 mt-1">
                          Timing is measured from when the user enters this sequence.
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Body</label>
                        <RichTextEditor
                          value={step.body}
                          onChange={(value) => handleStepChange(idx, "body", value)}
                          placeholder="Write your email content..."
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
                        Product: {getProductName(seq.productId)} • {seq.totalSteps} emails •{" "}
                        {seq.subscriberCount ?? 0} tracked
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
                        onClick={() => setViewingCustomers({ _id: seq._id, name: seq.name })}
                      >
                        <Users className="h-4 w-4 mr-1" />
                        Customers
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(seq)}
                      >
                        {seq.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(seq)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(seq._id, seq.name)}
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
      <SequenceCustomersDialog
        sequence={viewingCustomers}
        onClose={() => setViewingCustomers(null)}
      />
    </div>
  );
}
