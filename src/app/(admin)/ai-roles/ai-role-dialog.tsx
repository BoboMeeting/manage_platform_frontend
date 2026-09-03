"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createAiRole, updateAiRole, type AiRolePayload } from "@/lib/api/ai-roles";
import type { AiRole } from "@/types/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function AiRoleDialog({
  open,
  onOpenChange,
  role,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 传入则为编辑，否则为新建 */
  role: AiRole | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [promptTemplate, setPromptTemplate] = useState("");
  const [ttsConfig, setTtsConfig] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName(role?.name ?? "");
      setDescription(role?.description ?? "");
      setPromptTemplate(role?.promptTemplate ?? "");
      setTtsConfig(role?.ttsConfig ?? "");
    }
  }, [open, role]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !promptTemplate.trim()) {
      toast.error("名称和 Prompt 模板必填");
      return;
    }
    const payload: AiRolePayload = {
      name: name.trim(),
      description: description.trim() || null,
      promptTemplate: promptTemplate.trim(),
      ttsConfig: ttsConfig.trim() || null,
    };
    setSubmitting(true);
    try {
      if (role) {
        await updateAiRole(role.id, payload);
        toast.success("AI 角色已更新");
      } else {
        await createAiRole(payload);
        toast.success("AI 角色已创建");
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{role ? "编辑 AI 角色" : "新建 AI 角色"}</DialogTitle>
          <DialogDescription>
            角色模板用于用户入会时选择 AI 参会者
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="role-name">名称</Label>
            <Input
              id="role-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：英语老师"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role-desc">描述（可选）</Label>
            <Input
              id="role-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="一句话说明角色定位"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role-prompt">Prompt 模板</Label>
            <Textarea
              id="role-prompt"
              rows={5}
              value={promptTemplate}
              onChange={(e) => setPromptTemplate(e.target.value)}
              placeholder="系统提示词，定义 AI 的人设与行为…"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role-tts">TTS 配置（可选，JSON）</Label>
            <Input
              id="role-tts"
              value={ttsConfig}
              onChange={(e) => setTtsConfig(e.target.value)}
              placeholder='{"voice":"zh-CN-XiaoyiNeural","rate":"1.0"}'
              className="font-mono text-xs"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
