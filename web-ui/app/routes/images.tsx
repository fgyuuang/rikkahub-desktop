import * as React from "react";

import {
  ArrowLeft,
  ChevronDown,
  ImagePlus,
  Loader2,
  Plus,
  Trash2,
  WandSparkles,
  X,
} from "lucide-react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { motion } from "motion/react";

import { AIIcon } from "~/components/ui/ai-icon";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import { Textarea } from "~/components/ui/textarea";
import i18n from "~/i18n";
import { normalizeImageForModelUpload } from "~/lib/image-normalize";
import { cn } from "~/lib/utils";
import api from "~/services/api";
import { useSettingsStore } from "~/stores/app-store";
import type { ProviderModel } from "~/types";

interface UploadedFile {
  id: number;
  url: string;
  fileName: string;
  mime: string;
  size: number;
}

interface GeneratedImage {
  id: string;
  prompt: string;
  fileId: number;
  url: string;
  fileName: string;
  mime: string;
  model: string;
  modelId: string;
  type: "image_generation" | "image_edit";
  sourceFileIds: number[];
  sourcePaths?: string;
  createdAt: number;
}

type ImageModelOption = ProviderModel & {
  providerId: string;
  providerName: string;
  providerType?: string;
};

const ASPECT_PRESETS = [
  { value: "square", labelKey: "common:image_page.ratio_square", description: "1024×1024", width: 1024, height: 1024 },
  { value: "landscape", labelKey: "common:image_page.ratio_landscape", description: "1280×720", width: 1280, height: 720 },
  { value: "portrait", labelKey: "common:image_page.ratio_portrait", description: "720×1280", width: 720, height: 1280 },
] as const;

const DEFAULT_OPTION_VALUE = "__default__";
const QUALITY_OPTIONS = [DEFAULT_OPTION_VALUE, "auto", "low", "medium", "high"] as const;
const STYLE_OPTIONS = [DEFAULT_OPTION_VALUE, "auto", "vivid", "natural", "anime", "photographic", "cinematic", "illustration"] as const;
const BACKGROUND_OPTIONS = [DEFAULT_OPTION_VALUE, "auto", "opaque", "transparent", "white", "black"] as const;
const OUTPUT_FORMAT_OPTIONS = [DEFAULT_OPTION_VALUE, "png", "jpeg", "webp"] as const;

function presetForAspectRatio(value: string) {
  return ASPECT_PRESETS.find((item) => item.value === value) ?? ASPECT_PRESETS[0];
}

function modelLabel(model: ProviderModel, fallback: string) {
  return model?.displayName || model?.modelId || fallback;
}

function normalizeDimensionInput(value: string) {
  return value.replace(/[^\d]/g, "").slice(0, 5);
}

function optionLabel(
  value: string,
  fallbackKey: string,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  return value && value !== DEFAULT_OPTION_VALUE
    ? t(`image_page.option_${value}`, { defaultValue: value })
    : t(fallbackKey);
}

interface ImageControlPanelProps {
  mobile?: boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
  settingsReady: boolean;
  imageModels: ImageModelOption[];
  selectedModel?: ImageModelOption;
  selectedModelCanEdit: boolean;
  numberOfImages: string;
  setNumberOfImages: (value: string) => void;
  aspectRatio: string;
  onAspectRatioChange: (value: string) => void;
  width: string;
  setWidth: (value: string) => void;
  height: string;
  setHeight: (value: string) => void;
  quality: string;
  setQuality: (value: string) => void;
  style: string;
  setStyle: (value: string) => void;
  background: string;
  setBackground: (value: string) => void;
  outputFormat: string;
  setOutputFormat: (value: string) => void;
  negativePrompt: string;
  setNegativePrompt: (value: string) => void;
  advancedOpen: boolean;
  setAdvancedOpen: (value: boolean) => void;
  selectModel: (modelId: string) => Promise<void>;
  imageGenerationModelId?: string;
}

function ImageControlPanel(props: ImageControlPanelProps) {
  const {
    mobile,
    t,
    settingsReady,
    imageModels,
    selectedModel,
    selectedModelCanEdit,
    numberOfImages,
    setNumberOfImages,
    aspectRatio,
    onAspectRatioChange,
    width,
    setWidth,
    height,
    setHeight,
    quality,
    setQuality,
    style,
    setStyle,
    background,
    setBackground,
    outputFormat,
    setOutputFormat,
    negativePrompt,
    setNegativePrompt,
    advancedOpen,
    setAdvancedOpen,
    selectModel,
    imageGenerationModelId,
  } = props;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="text-sm font-medium">{t("image_page.model")}</div>
        <Select
          value={imageGenerationModelId || ""}
          onValueChange={(value) => void selectModel(value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("image_page.select_image_model")} />
          </SelectTrigger>
          <SelectContent>
            {imageModels.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                <span className="flex items-center gap-2">
                  <AIIcon name={model.providerName || model.displayName} className="size-4" />
                  {model.providerName ? `${model.providerName} / ` : ""}
                  {modelLabel(model, t("image_page.not_selected"))}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {imageModels.length === 0 ? (
          <div className="text-xs text-muted-foreground">{t("image_page.model_empty_hint")}</div>
        ) : null}
        {selectedModel && !selectedModelCanEdit ? (
          <div className="text-xs text-muted-foreground">{t("image_page.model_edit_only_hint")}</div>
        ) : null}
      </div>

      <div className={cn("grid gap-3", mobile ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2")}>
        <div className="space-y-2">
          <div className="text-sm font-medium">{t("image_page.count")}</div>
          <Select value={numberOfImages} onValueChange={setNumberOfImages}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4].map((value) => (
                <SelectItem key={value} value={String(value)}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <div className="text-sm font-medium">{t("image_page.ratio")}</div>
          <Select value={aspectRatio} onValueChange={onAspectRatioChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASPECT_PRESETS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {t(item.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className={cn("grid gap-3", mobile ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2")}>
        <div className="space-y-2">
          <div className="text-sm font-medium">{t("image_page.width")}</div>
          <Input
            inputMode="numeric"
            min={1}
            step={1}
            value={width}
            onChange={(event) => setWidth(normalizeDimensionInput(event.target.value))}
            placeholder="1024"
          />
        </div>
        <div className="space-y-2">
          <div className="text-sm font-medium">{t("image_page.height")}</div>
          <Input
            inputMode="numeric"
            min={1}
            step={1}
            value={height}
            onChange={(event) => setHeight(normalizeDimensionInput(event.target.value))}
            placeholder="1024"
          />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border bg-background/50 px-3 py-2 text-xs text-muted-foreground">
        <span>{t("image_page.size_hint", { size: `${width || "-"} × ${height || "-"}` })}</span>
        <span>{presetForAspectRatio(aspectRatio).description}</span>
      </div>

      <div className="rounded-xl border bg-background/40">
        <button
          type="button"
          className="flex w-full items-center justify-between px-3 py-2 text-left"
          onClick={() => setAdvancedOpen(!advancedOpen)}
          disabled={!settingsReady}
        >
          <div>
            <div className="text-sm font-medium">{t("image_page.advanced")}</div>
            <div className="text-xs text-muted-foreground">{t("image_page.advanced_subtitle")}</div>
          </div>
          <ChevronDown className={cn("size-4 transition-transform", advancedOpen ? "rotate-180" : "")} />
        </button>
        {advancedOpen ? (
          <div className="space-y-4 border-t px-3 py-3">
            <div className="space-y-2">
              <div className="text-sm font-medium">{t("image_page.negative_prompt")}</div>
              <Textarea
                value={negativePrompt}
                onChange={(event) => setNegativePrompt(event.target.value)}
                placeholder={t("image_page.negative_prompt_placeholder")}
                className="min-h-24 resize-y"
              />
            </div>
            <div className={cn("grid gap-3", mobile ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2")}>
              <div className="space-y-2">
                <div className="text-sm font-medium">{t("image_page.quality")}</div>
                <Select
                  value={quality || DEFAULT_OPTION_VALUE}
                  onValueChange={(value) => setQuality(value === DEFAULT_OPTION_VALUE ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("image_page.option_default")} />
                  </SelectTrigger>
                  <SelectContent>
                    {QUALITY_OPTIONS.map((value) => (
                      <SelectItem key={value || "default"} value={value}>
                        {optionLabel(value, "image_page.option_default", t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">{t("image_page.style")}</div>
                <Select
                  value={style || DEFAULT_OPTION_VALUE}
                  onValueChange={(value) => setStyle(value === DEFAULT_OPTION_VALUE ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("image_page.option_default")} />
                  </SelectTrigger>
                  <SelectContent>
                    {STYLE_OPTIONS.map((value) => (
                      <SelectItem key={value || "default"} value={value}>
                        {optionLabel(value, "image_page.option_default", t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">{t("image_page.background")}</div>
                <Select
                  value={background || DEFAULT_OPTION_VALUE}
                  onValueChange={(value) => setBackground(value === DEFAULT_OPTION_VALUE ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("image_page.option_default")} />
                  </SelectTrigger>
                  <SelectContent>
                    {BACKGROUND_OPTIONS.map((value) => (
                      <SelectItem key={value || "default"} value={value}>
                        {optionLabel(value, "image_page.option_default", t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">{t("image_page.output_format")}</div>
                <Select
                  value={outputFormat || DEFAULT_OPTION_VALUE}
                  onValueChange={(value) => setOutputFormat(value === DEFAULT_OPTION_VALUE ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("image_page.option_default")} />
                  </SelectTrigger>
                  <SelectContent>
                    {OUTPUT_FORMAT_OPTIONS.map((value) => (
                      <SelectItem key={value || "default"} value={value}>
                        {optionLabel(value, "image_page.option_default", t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">{t("image_page.advanced_hint")}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function meta() {
  return [{ title: `${i18n.t("common:image_page.title")} - RikkaHub` }];
}

export default function ImagesPage() {
  const { t } = useTranslation();
  const settings = useSettingsStore((state) => state.settings);
  const setSettings = useSettingsStore((state) => state.setSettings);
  const [prompt, setPrompt] = React.useState("");
  const [negativePrompt, setNegativePrompt] = React.useState("");
  const [numberOfImages, setNumberOfImages] = React.useState("1");
  const [aspectRatio, setAspectRatio] = React.useState("square");
  const [width, setWidth] = React.useState(String(ASPECT_PRESETS[0].width));
  const [height, setHeight] = React.useState(String(ASPECT_PRESETS[0].height));
  const [quality, setQuality] = React.useState("");
  const [style, setStyle] = React.useState("");
  const [background, setBackground] = React.useState("");
  const [outputFormat, setOutputFormat] = React.useState("");
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const [referenceImages, setReferenceImages] = React.useState<UploadedFile[]>([]);
  const [images, setImages] = React.useState<GeneratedImage[]>([]);
  const [generating, setGenerating] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const imageModels = React.useMemo<ImageModelOption[]>(() => {
    if (!settings) return [];
    return settings.providers
      .filter((provider) => provider.enabled !== false)
      .flatMap((provider) =>
        provider.models
          .filter(
            (model) =>
              model.type === "IMAGE" ||
              model.outputModalities?.includes("IMAGE") ||
              model.tools?.some(
                (tool) => String(tool.type ?? "").toLowerCase() === "image_generation",
              ),
          )
          .map((model) => ({
            ...model,
            providerId: provider.id,
            providerName: provider.name,
            providerType: String(provider.type ?? ""),
          })),
      );
  }, [settings]);

  const selectedModel = imageModels.find((model) => model.id === settings?.imageGenerationModelId);
  const selectedModelCanEdit = selectedModel?.providerType === "openai";
  const editBlocked = referenceImages.length > 0 && selectedModel ? !selectedModelCanEdit : false;
  const requestedImageCount = Math.min(4, Math.max(1, Number(numberOfImages) || 1));

  const refreshImages = React.useCallback(async () => {
    const response = await api.get<{ images: GeneratedImage[] }>("images");
    setImages(response.images);
  }, []);

  React.useEffect(() => {
    void refreshImages().catch((error: Error) => toast.error(error.message));
  }, [refreshImages]);

  const selectModel = React.useCallback(
    async (modelId: string) => {
      if (!settings) return;
      const next = { ...settings, imageGenerationModelId: modelId };
      setSettings(next);
      await api.post("settings/default-models", {
        chatModelId: settings.chatModelId,
        titleModelId: settings.titleModelId,
        translateModeId: settings.translateModeId,
        suggestionModelId: settings.suggestionModelId,
        imageGenerationModelId: modelId,
        ocrModelId: settings.ocrModelId,
        compressModelId: settings.compressModelId,
        titlePrompt: settings.titlePrompt,
        translatePrompt: settings.translatePrompt,
        suggestionPrompt: settings.suggestionPrompt,
        ocrPrompt: settings.ocrPrompt,
        compressPrompt: settings.compressPrompt,
      });
    },
    [setSettings, settings],
  );

  const onAspectRatioChange = React.useCallback((value: string) => {
    const preset = presetForAspectRatio(value);
    setAspectRatio(value);
    setWidth(String(preset.width));
    setHeight(String(preset.height));
  }, []);

  const uploadReferenceImages = React.useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      const form = new FormData();
      for (const file of Array.from(files).slice(0, 16 - referenceImages.length)) {
        const normalized = await normalizeImageForModelUpload(file);
        form.append("files", normalized, normalized.name);
      }
      const response = await api.postMultipart<{ files: UploadedFile[] }>("files/upload", form, {
        timeout: false,
      });
      setReferenceImages((current) => [...current, ...response.files].slice(0, 16));
    },
    [referenceImages.length],
  );

  const generate = React.useCallback(async () => {
    if (!prompt.trim()) {
      toast.error(t("image_page.no_prompt"));
      return;
    }
    if (!settings?.imageGenerationModelId) {
      toast.error(t("image_page.no_model"));
      return;
    }
    if (editBlocked) {
      toast.error(t("image_page.edit_blocked_msg"));
      return;
    }
    const widthValue = Number(width);
    const heightValue = Number(height);
    if (!Number.isInteger(widthValue) || widthValue <= 0 || !Number.isInteger(heightValue) || heightValue <= 0) {
      toast.error(t("image_page.size_invalid"));
      return;
    }
    setGenerating(true);
    try {
      const response = await api.post<{ images: GeneratedImage[] }>(
        "images/generate",
        {
          prompt: prompt.trim(),
          negativePrompt: negativePrompt.trim(),
          numberOfImages: requestedImageCount,
          aspectRatio,
          width: widthValue,
          height: heightValue,
          quality,
          style,
          background,
          outputFormat,
          referenceFileIds: referenceImages.map((image) => image.id),
        },
        { timeout: false },
      );
      setImages((current) => [...response.images, ...current]);
      toast.success(
        referenceImages.length ? t("image_page.edit_done") : t("image_page.generate_done"),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("image_page.generate_failed"));
    } finally {
      setGenerating(false);
    }
  }, [
    aspectRatio,
    background,
    editBlocked,
    height,
    negativePrompt,
    outputFormat,
    prompt,
    quality,
    referenceImages,
    requestedImageCount,
    settings?.imageGenerationModelId,
    style,
    t,
    width,
  ]);

  return (
    <div className="flex h-screen bg-background text-foreground">
      <aside className="hidden w-[360px] shrink-0 border-r bg-sidebar/80 px-4 pb-4 pt-9 md:block">
        <div className="flex items-center justify-between">
          <Button asChild size="icon-sm" variant="ghost">
            <Link to="/" aria-label={t("image_page.back_to_chat")} title={t("image_page.back_to_chat")}>
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/settings?section=models">{t("image_page.model_settings")}</Link>
          </Button>
        </div>
        <div className="mt-7 space-y-1">
          <div className="flex items-center gap-2 text-xl font-semibold">
            <WandSparkles className="size-5 text-primary" />
            {t("image_page.title")}
          </div>
          <div className="text-sm text-muted-foreground">{t("image_page.description")}</div>
        </div>
        <div className="mt-6 rounded-2xl border bg-card/80 p-4 shadow-card">
          <ImageControlPanel
            t={t}
            settingsReady={Boolean(settings)}
            imageModels={imageModels}
            selectedModel={selectedModel}
            selectedModelCanEdit={Boolean(selectedModelCanEdit)}
            numberOfImages={numberOfImages}
            setNumberOfImages={setNumberOfImages}
            aspectRatio={aspectRatio}
            onAspectRatioChange={onAspectRatioChange}
            width={width}
            setWidth={setWidth}
            height={height}
            setHeight={setHeight}
            quality={quality}
            setQuality={setQuality}
            style={style}
            setStyle={setStyle}
            background={background}
            setBackground={setBackground}
            outputFormat={outputFormat}
            setOutputFormat={setOutputFormat}
            negativePrompt={negativePrompt}
            setNegativePrompt={setNegativePrompt}
            advancedOpen={advancedOpen}
            setAdvancedOpen={setAdvancedOpen}
            selectModel={selectModel}
            imageGenerationModelId={settings?.imageGenerationModelId}
          />
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="border-b px-4 py-3 md:hidden">
          <div className="flex items-center justify-between">
            <Link className="text-sm text-muted-foreground" to="/">
              {t("image_page.back_to_chat")}
            </Link>
            <Link className="text-sm text-muted-foreground" to="/settings?section=models">
              {t("image_page.model_settings")}
            </Link>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="mx-auto max-w-6xl space-y-6 p-4 pb-8 md:pt-9">
            <section className="rounded-2xl border bg-card/85 p-4 shadow-card md:hidden">
              <ImageControlPanel
                mobile
                t={t}
                settingsReady={Boolean(settings)}
                imageModels={imageModels}
                selectedModel={selectedModel}
                selectedModelCanEdit={Boolean(selectedModelCanEdit)}
                numberOfImages={numberOfImages}
                setNumberOfImages={setNumberOfImages}
                aspectRatio={aspectRatio}
                onAspectRatioChange={onAspectRatioChange}
                width={width}
                setWidth={setWidth}
                height={height}
                setHeight={setHeight}
                quality={quality}
                setQuality={setQuality}
                style={style}
                setStyle={setStyle}
                background={background}
                setBackground={setBackground}
                outputFormat={outputFormat}
                setOutputFormat={setOutputFormat}
                negativePrompt={negativePrompt}
                setNegativePrompt={setNegativePrompt}
                advancedOpen={advancedOpen}
                setAdvancedOpen={setAdvancedOpen}
                selectModel={selectModel}
                imageGenerationModelId={settings?.imageGenerationModelId}
              />
            </section>

            <section className="rounded-2xl border bg-card/90 p-4 shadow-card">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">{t("image_page.prompt")}</div>
                  <div className="text-xs text-muted-foreground">{t("image_page.prompt_hint")}</div>
                </div>
                {selectedModel ? (
                  <div className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                    {selectedModel.providerName ? `${selectedModel.providerName} / ` : ""}
                    {modelLabel(selectedModel, t("image_page.not_selected"))}
                  </div>
                ) : null}
              </div>

              <Textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={t("image_page.prompt_placeholder")}
                className="min-h-32 resize-y border-0 bg-transparent p-0 text-base shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-0"
              />

              {referenceImages.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-3">
                  {referenceImages.map((image) => (
                    <div
                      key={image.id}
                      className="group relative size-24 overflow-hidden rounded-md border bg-muted"
                    >
                      <img src={image.url} alt={image.fileName} className="size-full object-cover" />
                      <button
                        type="button"
                        className="absolute right-1 top-1 rounded-full bg-background/90 p-1 opacity-0 shadow transition group-hover:opacity-100"
                        onClick={() =>
                          setReferenceImages((current) =>
                            current.filter((item) => item.id !== image.id),
                          )
                        }
                        aria-label={t("image_page.remove_image")}
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={inputRef}
                    className="sr-only"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    onChange={(event) => void uploadReferenceImages(event.target.files)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => inputRef.current?.click()}
                    disabled={
                      referenceImages.length >= 16 ||
                      generating ||
                      Boolean(selectedModel && !selectedModelCanEdit)
                    }
                  >
                    <ImagePlus className="size-4" />
                    {t("image_page.reference_image")}
                  </Button>
                  {referenceImages.length > 0 ? (
                    <span className="text-xs text-muted-foreground">
                      {t("image_page.reference_kept", { count: referenceImages.length })}
                    </span>
                  ) : null}
                  {editBlocked ? (
                    <span className="text-xs text-destructive">
                      {t("image_page.reference_edit_blocked")}
                    </span>
                  ) : null}
                </div>
                <Button
                  type="button"
                  onClick={() => void generate()}
                  disabled={generating || !settings?.imageGenerationModelId || editBlocked}
                >
                  {generating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                  {referenceImages.length ? t("image_page.edit") : t("image_page.generate")}
                </Button>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {generating &&
                Array.from({ length: requestedImageCount }).map((_, index) => (
                  <article
                    key={`skeleton-${index}`}
                    className="overflow-hidden rounded-xl border bg-card shadow-sm"
                  >
                    <Skeleton className="aspect-square w-full rounded-none" />
                    <div className="space-y-2 p-3">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </article>
                ))}
              {images.map((image, index) => (
                <motion.article
                  key={image.id}
                  initial={{ opacity: 0, scale: 0.96, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  className="group overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-card"
                >
                  <a
                    href={image.url}
                    target="_blank"
                    rel="noreferrer"
                    className="relative block bg-muted"
                  >
                    <img
                      src={image.url}
                      alt={image.prompt}
                      className="aspect-square w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  </a>
                  <div className="space-y-3 p-3">
                    <div className="line-clamp-2 text-sm">{image.prompt}</div>
                    <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span className="truncate">{image.model}</span>
                      <span>
                        {image.type === "image_edit"
                          ? t("image_page.badge_edit")
                          : t("image_page.badge_generate")}
                      </span>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={async () => {
                          await api.delete(`images/${image.id}`);
                          setImages((current) => current.filter((item) => item.id !== image.id));
                        }}
                        aria-label={t("image_page.delete")}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </motion.article>
              ))}
            </section>

            {images.length === 0 ? (
              <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
                {t("image_page.empty")}
              </div>
            ) : null}
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
