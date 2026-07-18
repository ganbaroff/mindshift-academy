"use client";

import React, { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { useGameStore } from "@/stores/game";

export const VideoSimulator = () => {
  const { isPlaying, setIsPlaying, setSteps, updateXP } = useGameStore();
  const [videoTime, setVideoTime] = useState("0:00 / 1:30");
  const [videoProgress, setVideoProgress] = useState(0);
  const [rewardStatus, setRewardStatus] = useState("");
  
  const videoInterval = useRef<NodeJS.Timeout | null>(null);
  const videoCurrentTime = useRef(0);

  useEffect(() => {
    if (isPlaying) {
      videoInterval.current = setInterval(() => {
        videoCurrentTime.current += 1;
        if (videoCurrentTime.current >= 90) {
          videoCurrentTime.current = 90;
          if (videoInterval.current) clearInterval(videoInterval.current);
          setIsPlaying(false);
          setSteps((prev) => prev.map((s) => s.id === 1 ? { ...s, status: "completed" } : s));
          setRewardStatus("Ты посмотрел видео-инструкцию и получил +100 XP!");
          updateXP(100);
        }
        const percent = (videoCurrentTime.current / 90) * 100;
        setVideoProgress(percent);
        
        const mins = Math.floor(videoCurrentTime.current / 60);
        const secs = videoCurrentTime.current % 60;
        setVideoTime(`${mins}:${secs < 10 ? "0" : ""}${secs} / 1:30`);
      }, 1000);
    } else {
      if (videoInterval.current) clearInterval(videoInterval.current);
    }
    return () => {
      if (videoInterval.current) clearInterval(videoInterval.current);
    };
  }, [isPlaying, setIsPlaying, setSteps, updateXP]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="relative overflow-hidden aspect-[16/10] bg-black rounded-2xl border border-white/10 shadow-2xl flex items-center justify-center group">
      <div className="absolute inset-0 bg-gradient-to-br from-[#1e1b4b] to-[#0f172a] opacity-60 group-hover:opacity-40 transition-opacity" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 z-10" />
      
      <span className="absolute top-4 left-4 bg-violet-600/90 text-white text-[11px] font-bold tracking-wider uppercase px-3 py-1 rounded-full border border-white/20 z-20">
        Инструкция ИИ-гида
      </span>
      
      <button
        onClick={togglePlay}
        aria-label={isPlaying ? "Пауза видео-инструкции" : "Смотреть видео-инструкцию"}
        aria-pressed={isPlaying}
        className="relative w-16 h-16 rounded-full bg-violet-500 flex items-center justify-center text-white shadow-[0_0_30px_rgba(139,92,246,0.4)] hover:bg-cyan-500 hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] transition-[transform,box-shadow,background-color] transform hover:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 z-20"
      >
        {isPlaying ? <Pause aria-hidden="true" className="w-6 h-6 fill-white" /> : <Play aria-hidden="true" className="w-6 h-6 fill-white translate-x-[2px]" />}
      </button>

      <p role="status" aria-live="polite" className="sr-only">{rewardStatus}</p>

      <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-2 z-20">
        <div
          className="h-1 bg-white/20 rounded-full overflow-hidden"
          role="progressbar"
          aria-label="Прогресс видео"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(videoProgress)}
          aria-valuetext={videoTime}
        >
          <div
            className="h-full bg-cyan-400 transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: `${videoProgress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400">
          <span className="tabular-nums">{videoTime}</span>
          <span>1080p AI Avatar</span>
        </div>
      </div>
    </div>
  );
};
