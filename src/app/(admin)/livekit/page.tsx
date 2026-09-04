"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";

import { getLiveKitConfig, saveLiveKitConfig, type LiveKitConfigPayload } from "@/lib/api/livekit-config";
import { ApiError } from "@/lib/api/client";
import type { LiveKitConfig } from "@/types/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LiveKitConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  /** 后端返回的脱敏值：用户提交值与其相同时视为"不修改"，将空串传给后端 */
  const [maskedSecret, setMaskedSecret] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string>("");
  /** 是否为首次配置（库中尚无记录），此时必须填写 Secret */
  const [firstConfig, setFirstConfig] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const cfg: LiveKitConfig = await getLiveKitConfig();
      setUrl(cfg.url);
      setApiKey(cfg.apiKey);
      setMaskedSecret(cfg.apiSecretMasked);
      setApiSecret(cfg.apiSecretMasked);
      setUpdatedAt(cfg.updatedAt);
      setFirstConfig(!cfg.fromDatabase);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "加载 LiveKit 配置失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) {
      toast.error("服务地址 Url 必填");
      return;
    }
    if (!apiKey.trim()) {
      toast.error("ApiKey 必填");
      return;
    }
    // 提交语义：
    //   - 若 input 值仍等于后端返回的 apiSecretMasked 视为"未改动" → 传空串
    //   - 否则视为"用户想要更新 secret" → 传 input 原值
    const userChangedSecret = apiSecret !== maskedSecret;
    let finalSecret = "";
    if (userChangedSecret) {
      finalSecret = apiSecret;
    }
    if (firstConfig || userChangedSecret) {
      if (!finalSecret || finalSecret.length < 8) {
        toast.error(firstConfig
          ? "首次配置必须提供 ApiSecret（长度至少 8 位，建议 ≥ 32 字节）"
          : "新的 ApiSecret 长度至少 8 位");
        return;
      }
    }
    const payload: LiveKitConfigPayload = {
      url: url.trim(),
      apiKey: apiKey.trim(),
      apiSecret: finalSecret,
    };
    setSaving(true);
    try {
      const saved = await saveLiveKitConfig(payload);
      setMaskedSecret(saved.apiSecretMasked);
      setApiSecret(saved.apiSecretMasked);
      setUpdatedAt(saved.updatedAt);
      setFirstConfig(false);
      toast.success("LiveKit 配置已保存");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">LiveKit 服务配置</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            配置 LiveKit 媒体服务器地址、API Key / Secret。
            保存后新的入会请求将立即生效，无需重启服务。
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading || saving}>
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          刷新
        </Button>
      </div>

      {loading ? (
        <div className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
          <Loader2 className="size-4 animate-spin" />
          加载中…
        </div>
      ) : (
        <form onSubmit={onSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>连接信息</CardTitle>
              <CardDescription>
                这些参数必须与 LiveKit Server 启动配置保持一致。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="lk-url">服务地址（Url）</Label>
                <Input
                  id="lk-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="ws://livekit.example.com:7880 或 wss://..."
                  className="font-mono"
                />
                <p className="text-muted-foreground text-xs">
                  客户端通过此 WebSocket 地址连接 LiveKit Server。
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lk-key">API Key</Label>
                <Input
                  id="lk-key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="devkey"
                  className="font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lk-secret">API Secret</Label>
                <div className="relative">
                  <Input
                    id="lk-secret"
                    type={showSecret ? "text" : "password"}
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    placeholder={firstConfig ? "请输入新的 API Secret（建议 ≥ 32 字节）" : "不修改请留为脱敏值；需要更新请输入新的 Secret"}
                    className="font-mono pr-10"
                  />
                  <button
                    type="button"
                    aria-label={showSecret ? "隐藏" : "显示"}
                    onClick={() => setShowSecret((s) => !s)}
                    className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex items-center px-3"
                  >
                    {showSecret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <p className="text-muted-foreground text-xs">
                  {firstConfig
                    ? "长度建议 ≥ 32 字节；必须与 LiveKit Server 配置的 api_secret 一致。"
                    : "长度建议 ≥ 32 字节；若未修改，显示为脱敏字符串（无需重新填写）。"}
                </p>
              </div>

              {updatedAt && (
                <div className="text-muted-foreground text-xs">
                  最后更新时间：{new Date(updatedAt).toLocaleString()}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button
                type="submit"
                disabled={saving}
                className="gap-2"
              >
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                保存配置
              </Button>
            </CardFooter>
          </Card>
        </form>
      )}
    </div>
  );
}
