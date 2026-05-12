"use client"

import { useState } from "react"

import { Clock, Eye, EyeOff, Trash2 } from "lucide-react"

import { useStudioStore, type TextOverlay } from "@/store/studio"

// Preset colors for text and background pickers
const TEXT_COLORS = [
  { label: "White", value: "#ffffff" },
  { label: "Black", value: "#000000" },
  { label: "Red", value: "#ef4444" },
  { label: "Yellow", value: "#eab308" },
  { label: "Green", value: "#22c55e" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Violet", value: "#8b5cf6" },
]

const BG_COLORS = [
  { label: "Black", value: "#000000cc" },
  { label: "Dark", value: "#1a1a1acc" },
  { label: "Red", value: "#7f1d1dcc" },
  { label: "Yellow", value: "#713f12cc" },
  { label: "Green", value: "#14532dcc" },
  { label: "Blue", value: "#1e3a8acc" },
  { label: "Violet", value: "#4c1d95cc" },
  { label: "None", value: "transparent" },
]

const STAGE_BG_COLORS = [
  { label: "Near Black", value: "#0d0d0d" },
  { label: "Black", value: "#000000" },
  { label: "Dark Gray", value: "#1a1a1a" },
  { label: "Navy", value: "#0a0f2e" },
  { label: "Dark Green", value: "#0a1f0a" },
  { label: "Dark Purple", value: "#1a0a2e" },
  { label: "Dark Red", value: "#1f0a0a" },
  { label: "Slate", value: "#0f172a" },
]

const POSITIONS: { label: string; value: TextOverlay["position"] }[] = [
  { label: "Top Center", value: "top" },
  { label: "Top Left", value: "top-left" },
  { label: "Top Right", value: "top-right" },
  { label: "Bottom Center", value: "bottom" },
  { label: "Bottom Left", value: "bottom-left" },
  { label: "Bottom Right", value: "bottom-right" },
]

function ColorSwatch({
  colors,
  selected,
  onSelect,
  groupLabel,
}: {
  colors: { label: string; value: string }[]
  selected: string
  onSelect: (v: string) => void
  groupLabel?: string
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={groupLabel}>
      {colors.map((c) => {
        const isSelected = selected === c.value
        return (
          <button
            key={c.value}
            type="button"
            title={c.label}
            role="radio"
            aria-checked={isSelected}
            aria-label={`${groupLabel ? groupLabel + ": " : ""}${c.label}`}
            onClick={() => onSelect(c.value)}
            className={[
              "w-6 h-6 rounded-full border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]",
              isSelected ? "border-violet-400 scale-110" : "border-white/20 hover:border-white/50",
              c.value === "transparent" ? "bg-transparent" : "",
            ].join(" ")}
            style={c.value !== "transparent" ? { backgroundColor: c.value } : undefined}
          >
            {c.value === "transparent" && (
              <span className="text-[9px] text-gray-500 leading-none">∅</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default function TextOverlayPanel() {
  const textOverlays = useStudioStore((s) => s.textOverlays)
  const stageBackground = useStudioStore((s) => s.stageBackground)
  const addTextOverlay = useStudioStore((s) => s.addTextOverlay)
  const removeTextOverlay = useStudioStore((s) => s.removeTextOverlay)
  const toggleTextOverlay = useStudioStore((s) => s.toggleTextOverlay)
  const setStageBackground = useStudioStore((s) => s.setStageBackground)

  // Form state for new overlay
  const [text, setText] = useState("")
  const [position, setPosition] = useState<TextOverlay["position"]>("bottom")
  const [fontSize, setFontSize] = useState<TextOverlay["fontSize"]>("md")
  const [color, setColor] = useState("#ffffff")
  const [bgColor, setBgColor] = useState("#000000cc")
  // Duration: "" means permanent; number string means seconds
  const [durationSecs, setDurationSecs] = useState("")

  const handleAdd = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    const durNum = parseInt(durationSecs, 10)
    const expiresAt = !isNaN(durNum) && durNum > 0 ? Date.now() + durNum * 1000 : null
    addTextOverlay({ text: trimmed, position, fontSize, color, bgColor, visible: true, expiresAt })
    setText("")
    setDurationSecs("")
  }

  return (
    <div className="w-72 bg-[#111111] border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/8 flex-none">
        <p className="text-xs font-semibold text-white uppercase tracking-wider">Text Overlays</p>
      </div>

      <div className="overflow-y-auto flex-1 p-4 space-y-5">
        {/* --- New overlay form --- */}
        <div className="space-y-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter overlay text..."
            rows={2}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-violet-500/60 transition-colors"
          />

          {/* Position grid */}
          <div>
            <p className="text-[10px] text-gray-500 mb-1.5 uppercase tracking-wider">Position</p>
            <div className="grid grid-cols-3 gap-1">
              {POSITIONS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPosition(p.value)}
                  className={[
                    "px-2 py-1 rounded-md text-[10px] font-medium transition-all",
                    position === p.value
                      ? "bg-violet-500/30 text-violet-300 border border-violet-500/40"
                      : "bg-white/5 text-gray-400 border border-white/8 hover:bg-white/8 hover:text-gray-300",
                  ].join(" ")}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font size */}
          <div>
            <p className="text-[10px] text-gray-500 mb-1.5 uppercase tracking-wider">Font Size</p>
            <div className="flex gap-1.5">
              {(["sm", "md", "lg"] as TextOverlay["fontSize"][]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFontSize(s)}
                  className={[
                    "flex-1 py-1 rounded-md font-medium transition-all border",
                    fontSize === s
                      ? "bg-violet-500/30 text-violet-300 border-violet-500/40"
                      : "bg-white/5 text-gray-400 border-white/8 hover:bg-white/8 hover:text-gray-300",
                    s === "sm" ? "text-[10px]" : s === "md" ? "text-xs" : "text-sm",
                  ].join(" ")}
                >
                  {s.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Text color */}
          <div>
            <p className="text-[10px] text-gray-500 mb-1.5 uppercase tracking-wider">Text Color</p>
            <ColorSwatch colors={TEXT_COLORS} selected={color} onSelect={setColor} groupLabel="Text color" />
          </div>

          {/* Background color */}
          <div>
            <p className="text-[10px] text-gray-500 mb-1.5 uppercase tracking-wider">Background</p>
            <ColorSwatch colors={BG_COLORS} selected={bgColor} onSelect={setBgColor} groupLabel="Background color" />
          </div>

          {/* Duration */}
          <div>
            <p className="text-[10px] text-gray-500 mb-1.5 uppercase tracking-wider">Duration</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={durationSecs}
                onChange={(e) => setDurationSecs(e.target.value)}
                placeholder="Permanent"
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/60 transition-colors"
              />
              <span className="text-xs text-gray-500 whitespace-nowrap">sec</span>
            </div>
            <p className="text-[9px] text-gray-600 mt-1">Leave blank for permanent overlay</p>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={!text.trim()}
            className="w-full py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-all"
          >
            Add to Stage
          </button>
        </div>

        {/* --- Existing overlays list --- */}
        {textOverlays.length > 0 && (
          <div>
            <p className="text-[10px] text-gray-500 mb-2 uppercase tracking-wider">On Stage</p>
            <div className="space-y-1.5">
              {textOverlays.map((overlay) => (
                <div
                  key={overlay.id}
                  className="flex items-center gap-2 bg-white/4 rounded-lg px-2.5 py-2 group"
                >
                  {/* Color dot */}
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-none"
                    style={{ backgroundColor: overlay.color }}
                  />
                  {/* Text */}
                  <span
                    className={[
                      "flex-1 min-w-0 text-xs truncate",
                      overlay.visible ? "text-gray-200" : "text-gray-600",
                    ].join(" ")}
                    title={overlay.text}
                  >
                    {overlay.text}
                  </span>
                  {/* Position badge */}
                  <span className="text-[9px] text-gray-600 flex-none">{overlay.position}</span>
                  {/* Timer badge */}
                  {overlay.expiresAt !== null && (
                    <span
                      className="flex items-center gap-0.5 text-[9px] text-amber-500 flex-none"
                      title={`Expires at ${new Date(overlay.expiresAt).toLocaleTimeString()}`}
                    >
                      <Clock className="w-2.5 h-2.5" />
                      {Math.max(0, Math.ceil((overlay.expiresAt - Date.now()) / 1000))}s
                    </span>
                  )}
                  {/* Toggle visibility */}
                  <button
                    type="button"
                    onClick={() => toggleTextOverlay(overlay.id)}
                    aria-label={overlay.visible ? `Hide overlay "${overlay.text}"` : `Show overlay "${overlay.text}"`}
                    aria-pressed={overlay.visible}
                    className="p-1 rounded text-gray-500 hover:text-white transition-colors flex-none focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                    title={overlay.visible ? "Hide overlay" : "Show overlay"}
                  >
                    {overlay.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => removeTextOverlay(overlay.id)}
                    aria-label={`Remove overlay "${overlay.text}"`}
                    className="p-1 rounded text-gray-600 hover:text-red-400 transition-colors flex-none focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                    title="Remove overlay"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- Stage Background --- */}
        <div>
          <p className="text-[10px] text-gray-500 mb-1.5 uppercase tracking-wider">Stage Background</p>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Stage background">
            {STAGE_BG_COLORS.map((c) => {
              const isSelected = stageBackground === c.value
              return (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={`Stage background: ${c.label}`}
                  onClick={() => setStageBackground(c.value)}
                  className={[
                    "w-6 h-6 rounded-full border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]",
                    isSelected
                      ? "border-violet-400 scale-110"
                      : "border-white/20 hover:border-white/50",
                  ].join(" ")}
                  style={{ backgroundColor: c.value }}
                />
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
