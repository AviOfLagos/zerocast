"use client"

import { useCallback, useEffect, useState } from "react"

import { useMediaDeviceSelect } from "@livekit/components-react"
import { ChevronDown, Headphones, Mic, Video } from "lucide-react"

type DeviceKind = "audioinput" | "videoinput" | "audiooutput"

interface DeviceSelectorProps {
  kind: DeviceKind
}

const ICONS: Record<DeviceKind, React.ReactNode> = {
  audioinput: <Mic className="w-3.5 h-3.5" />,
  videoinput: <Video className="w-3.5 h-3.5" />,
  audiooutput: <Headphones className="w-3.5 h-3.5" />,
}

const LABELS: Record<DeviceKind, string> = {
  audioinput: "Microphone",
  videoinput: "Camera",
  audiooutput: "Speaker",
}

function DevicePicker({ kind }: DeviceSelectorProps) {
  const { devices, activeDeviceId, setActiveMediaDevice } = useMediaDeviceSelect({ kind })
  const [open, setOpen] = useState(false)

  const handleSelect = useCallback(
    (deviceId: string) => {
      setActiveMediaDevice(deviceId)
      setOpen(false)
    },
    [setActiveMediaDevice]
  )

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    document.addEventListener("click", close)
    return () => document.removeEventListener("click", close)
  }, [open])

  if (devices.length <= 1) return null

  const activeDevice = devices.find((d) => d.deviceId === activeDeviceId)
  const label = activeDevice?.label?.split("(")[0]?.trim() ?? LABELS[kind]

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/4 hover:bg-white/8 text-gray-400 hover:text-white text-[10px] transition-colors max-w-36 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]"
        title={`Select ${LABELS[kind]}`}
      >
        {ICONS[kind]}
        <span className="truncate">{label}</span>
        <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={LABELS[kind]}
          className="absolute bottom-full mb-1 left-0 z-50 w-64 max-h-[60vh] bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-[10px] text-gray-500 uppercase tracking-wider px-3 py-1.5 font-semibold flex-none border-b border-white/6">
            {LABELS[kind]}
          </p>
          <div className="overflow-y-auto py-1">
            {devices.map((device) => (
              <button
                key={device.deviceId}
                type="button"
                role="option"
                aria-selected={device.deviceId === activeDeviceId}
                onClick={() => handleSelect(device.deviceId)}
                className={`w-full text-left px-3 py-2 text-xs transition-colors truncate focus:outline-none focus-visible:bg-white/8 ${
                  device.deviceId === activeDeviceId
                    ? "text-violet-400 bg-violet-500/10"
                    : "text-gray-300 hover:bg-white/5"
                }`}
              >
                {device.label || `${LABELS[kind]} ${device.deviceId.slice(0, 6)}`}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function DeviceSelector() {
  return (
    <div className="flex items-center gap-1">
      <DevicePicker kind="audioinput" />
      <DevicePicker kind="videoinput" />
      <DevicePicker kind="audiooutput" />
    </div>
  )
}
