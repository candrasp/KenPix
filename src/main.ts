import {
  createIcons,
  Home as HomeIcon,
  Settings as SettingsIcon,
  UploadCloud,
  Image as ImageIcon,
  CheckCircle2,
  RefreshCw,
  Folder,
  History,
  Info,
  X,
  PercentDiamond
} from "lucide";
import { convertFileSrc } from "@tauri-apps/api/core";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "./App.css";

// Interface for Tauri progress payload
interface ProgressPayload {
  progress: number;
  total: number;
  current_file: string;
}

interface HistoryItem {
  id: string;
  name: string;
  convertedAt: string;
  outputFolder: string;
  outputPath: string;
}

interface ConvertResult {
  success: boolean;
  error: string | null;
}

// Global State
let selectedFiles: any[] = [];
let targetFormat = "png";
let outputDir = "C:\\Users\\Default\\Pictures";
let isCancelled = false;
let conversionHistory: HistoryItem[] = [];

const HISTORY_STORAGE_KEY = "kenpix_conversion_history";

// Initialize Lucide Icons
function initIcons() {
  createIcons({
    icons: {
      Home: HomeIcon,
      Settings: SettingsIcon,
      UploadCloud,
      Image: ImageIcon,
      CheckCircle2,
      RefreshCw,
      Folder,
      History,
      Info,
      X,
      PercentDiamond
    }
  });
}

// DOM Elements
const navHomeBtn = document.getElementById("nav-home") as HTMLButtonElement;
const navSettingsBtn = document.getElementById("nav-settings") as HTMLButtonElement;
const navHistoryBtn = document.getElementById("nav-history") as HTMLButtonElement;
const viewHome = document.getElementById("view-home") as HTMLElement;
const viewSettings = document.getElementById("view-settings") as HTMLElement;
const viewHistory = document.getElementById("view-history") as HTMLElement;

const dropZone = document.getElementById("drop-zone") as HTMLDivElement;
const filesSection = document.getElementById("files-section") as HTMLDivElement;
const filesList = document.getElementById("files-list") as HTMLDivElement;
const fileCountSpan = document.getElementById("file-count") as HTMLSpanElement;
const formatSelect = document.getElementById("format-select") as HTMLSelectElement;
const btnConvert = document.getElementById("btn-convert") as HTMLButtonElement;

const convertingSection = document.getElementById("converting-section") as HTMLDivElement;
const progressBar = document.getElementById("progress-bar") as HTMLDivElement;
const progressText = document.getElementById("progress-text") as HTMLSpanElement;
const btnCancel = document.getElementById("btn-cancel") as HTMLButtonElement;

const doneSection = document.getElementById("done-section") as HTMLDivElement;
const summaryList = document.getElementById("summary-list") as HTMLDivElement;
const btnRestart = document.getElementById("btn-restart") as HTMLButtonElement;

const settingsOutputDir = document.getElementById("settings-output-dir") as HTMLInputElement;
const btnBrowse = document.getElementById("btn-browse") as HTMLButtonElement;

const historyList = document.getElementById("history-list") as HTMLDivElement;
const historyEmpty = document.getElementById("history-empty") as HTMLDivElement;
const btnClearHistory = document.getElementById("btn-clear-history") as HTMLButtonElement;

const activeNavClass = "p-2 rounded-md bg-[#27272a] text-[#fafafa] transition-colors cursor-pointer";
const inactiveNavClass = "p-2 rounded-md text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#27272a]/50 transition-colors cursor-pointer";

function showView(view: "home" | "settings" | "history") {
  viewHome.style.display = view === "home" ? "flex" : "none";
  viewSettings.style.display = view === "settings" ? "flex" : "none";
  viewHistory.style.display = view === "history" ? "flex" : "none";

  navHomeBtn.className = view === "home" ? activeNavClass : inactiveNavClass;
  navSettingsBtn.className = view === "settings" ? activeNavClass : inactiveNavClass;
  navHistoryBtn.className = view === "history" ? activeNavClass : inactiveNavClass;
}

// 1. Navigation Logic
navHomeBtn.addEventListener("click", () => {
  showView("home");
});

navSettingsBtn.addEventListener("click", () => {
  showView("settings");
});

navHistoryBtn.addEventListener("click", () => {
  renderHistory();
  showView("history");
});

// 2. Settings Logic
async function initSettings() {
  const savedDir = localStorage.getItem("kenpix_output_dir");
  if (savedDir) {
    outputDir = savedDir;
    settingsOutputDir.value = outputDir;
  } else {
    try {
      const defaultDir = await invoke<string>("get_default_output_dir");
      outputDir = defaultDir;
      settingsOutputDir.value = outputDir;
      localStorage.setItem("kenpix_output_dir", outputDir);
    } catch (e) {
      console.error("Failed to fetch default directory", e);
    }
  }
}

btnBrowse.addEventListener("click", async () => {
  try {
    const selected = await invoke<string | null>("select_directory");
    if (selected) {
      outputDir = selected;
      settingsOutputDir.value = outputDir;
      localStorage.setItem("kenpix_output_dir", outputDir);
    }
  } catch (e) {
    console.error("Error choosing folder", e);
  }
});

function getFileNameFromPath(path: string) {
  return path.replace(/^.*[\\\/]/, '');
}

function getFileStemFromName(name: string) {
  const lastDotIndex = name.lastIndexOf(".");
  return lastDotIndex > 0 ? name.slice(0, lastDotIndex) : name;
}

function joinPath(folder: string, fileName: string) {
  const separator = folder.includes("\\") ? "\\" : "/";
  return `${folder.replace(/[\\\/]$/, "")}${separator}${fileName}`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function loadHistory() {
  try {
    const savedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
    conversionHistory = savedHistory ? JSON.parse(savedHistory) : [];
  } catch (e) {
    console.error("Failed to load conversion history", e);
    conversionHistory = [];
  }
}

function saveHistory() {
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(conversionHistory));
}

async function openHistoryFolder(folderPath: string) {
  try {
    await invoke("open_folder_path", { path: folderPath });
  } catch (e) {
    console.error("Failed to open history folder", e);
    alert(`Gagal membuka folder: ${folderPath}`);
  }
}

function renderHistory() {
  historyEmpty.style.display = conversionHistory.length === 0 ? "block" : "none";
  btnClearHistory.style.display = conversionHistory.length === 0 ? "none" : "inline-flex";

  historyList.innerHTML = conversionHistory.map((item) => `
    <button type="button" class="glass rounded-none p-4 flex gap-4 items-center w-full text-left cursor-pointer hover:bg-[#161618] transition-colors" data-history-folder="${item.outputFolder}" title="Buka folder output">
      <div class="w-20 h-20 rounded-lg bg-[#27272a] overflow-hidden shrink-0 flex items-center justify-center">
        <img src="${convertFileSrc(item.outputPath)}" alt="${item.name}" class="w-full h-full object-cover" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
        <i data-lucide="image" class="w-8 h-8 text-[#a1a1aa]" style="display: none;"></i>
      </div>
      <div class="min-w-0 flex-1 space-y-1">
        <p class="font-medium truncate">${item.name}</p>
        <p class="text-sm text-[#a1a1aa]">${formatDateTime(item.convertedAt)}</p>
        <p class="text-xs text-[#a1a1aa] truncate" title="${item.outputFolder}">${item.outputFolder}</p>
      </div>
    </button>
  `).join("");

  historyList.querySelectorAll<HTMLButtonElement>("[data-history-folder]").forEach((element) => {
    element.addEventListener("click", () => {
      const folderPath = element.dataset.historyFolder;
      if (folderPath) {
        void openHistoryFolder(folderPath);
      }
    });
  });

  initIcons();
}

function addHistoryItems(files: any[]) {
  const convertedAt = new Date().toISOString();
  const outputFolder = joinPath(outputDir, targetFormat);
  const newItems = files.map((file: any, index: number) => {
    const sourceName = file.name || getFileNameFromPath(file.path || "image");
    const outputName = `${getFileStemFromName(sourceName)}.${targetFormat}`;
    const outputPath = joinPath(outputFolder, outputName);

    return {
      id: `${Date.now()}-${index}-${outputName}`,
      name: outputName,
      convertedAt,
      outputFolder,
      outputPath
    };
  });

  conversionHistory = [...newItems, ...conversionHistory].slice(0, 100);
  saveHistory();
}

btnClearHistory.addEventListener("click", () => {
  conversionHistory = [];
  saveHistory();
  renderHistory();
});

// 3. File Drag & Drop Logic
listen<{ paths: string[] }>("tauri://drag-drop", (event) => {
  if (viewHome.style.display === "none") return; // Only accept drops on home screen
  
  const dropped = event.payload.paths.map(path => {
    // Extract filename from path (works for windows \ and posix /)
    const name = getFileNameFromPath(path);
    return { name, path, size: 0 }; // Native drop doesn't provide size without fs read
  });
  
  selectedFiles = [...selectedFiles, ...dropped as any];
  updateFilesUI();
});

// Disable default HTML5 drag over to prevent conflicts
document.addEventListener("dragover", (e) => e.preventDefault());
document.addEventListener("drop", (e) => e.preventDefault());

dropZone.addEventListener("click", async () => {
  try {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({
      multiple: true,
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "avif"] }]
    });
    
    if (selected) {
      // selected can be string or string[] depending on multiple
      const paths = Array.isArray(selected) ? selected : [selected];
      const newFiles = paths.map(path => {
        const name = getFileNameFromPath(path);
        return { name, path, size: 0 };
      });
      selectedFiles = [...selectedFiles, ...newFiles as any];
      updateFilesUI();
    }
  } catch (e) {
    console.error("Error opening file dialog", e);
  }
});

function updateFilesUI() {
  if (selectedFiles.length > 0) {
    filesSection.classList.remove("hidden");
    fileCountSpan.innerText = selectedFiles.length.toString();
    
    filesList.innerHTML = selectedFiles.map((file: any) => `
      <div class="flex items-center gap-3 p-3 rounded-lg bg-[#27272a]/50">
        <i data-lucide="image" class="w-5 h-5 text-indigo-400"></i>
        <span class="flex-1 truncate text-sm">${file.name}</span>
        <span class="text-xs text-[#a1a1aa]">${file.size > 0 ? (file.size / 1024 / 1024).toFixed(2) + ' MB' : 'Ready'}</span>
      </div>
    `).join("");
    
    initIcons();
  } else {
    filesSection.classList.add("hidden");
  }
}

// 4. Conversion Logic
btnConvert.addEventListener("click", async () => {
  if (selectedFiles.length === 0) {
    console.warn("No files selected");
    return;
  }

  targetFormat = formatSelect.value;
  const filePaths = selectedFiles.map((f: any) => f.path).filter(Boolean);

  console.log("Starting conversion:", { filePaths, targetFormat, outputDir });

  if (filePaths.length === 0) {
    alert("Tidak ada path file yang valid. Silakan tambahkan file kembali.");
    return;
  }

  // Show converting UI
  isCancelled = false;
  dropZone.classList.add("hidden");
  filesSection.classList.add("hidden");
  convertingSection.style.display = "flex";
  progressBar.style.width = "0%";
  progressText.innerText = "0%";
  initIcons(); // re-init so cancel button X icon renders

  try {
    // Note: Tauri automatically converts camelCase JS keys to snake_case for Rust
    const result = await invoke<ConvertResult>("convert_images", {
      files: filePaths,
      targetFormat: targetFormat,
      outputDir: outputDir
    });

    console.log("Conversion result:", result);

    if (result.success) {
      addHistoryItems(selectedFiles);
      showSummary();
    } else {
      console.error("Conversion failed:", result.error);
      alert("Konversi gagal: " + result.error);
      resetConverter();
    }
  } catch (e) {
    console.error("Conversion invoke error:", e);
    alert("Error saat konversi: " + e);
    resetConverter();
  }
});

function showSummary() {
  convertingSection.style.display = "none";
  doneSection.style.display = "flex";

  summaryList.innerHTML = selectedFiles.map((file: any) => `
    <div class="flex justify-between text-sm py-1">
      <span class="truncate pr-4 text-[#a1a1aa]">${file.name}</span>
      <span class="text-emerald-400">✓ Done</span>
    </div>
  `).join("");
}

btnRestart.addEventListener("click", () => {
  resetConverter();
});

function resetConverter() {
  selectedFiles = [];
  dropZone.classList.remove("hidden");
  filesSection.classList.add("hidden");
  convertingSection.style.display = "none";
  doneSection.style.display = "none";
  updateFilesUI();
}

// Cancel button logic
btnCancel.addEventListener("click", () => {
  isCancelled = true;
  convertingSection.style.display = "none";
  dropZone.classList.remove("hidden");
  filesSection.classList.remove("hidden");
  progressBar.style.width = "0%";
  progressText.innerText = "0%";
  // Note: The Rust convert_images command will still finish in background,
  // but the UI is immediately reset and results are ignored.
  updateFilesUI();
});

// 5. Connect Tauri Event Listener for Progress
listen<ProgressPayload>("convert-progress", (event) => {
  if (isCancelled) return; // ignore progress events after cancel
  const progress = event.payload.progress;
  progressBar.style.width = `${progress}%`;
  progressText.innerText = `${progress}%`;
});

// Bootstrap
document.addEventListener("DOMContentLoaded", () => {
  initIcons();
  loadHistory();
  renderHistory();
  initSettings();
  // Mark body as css-ready so content fades in cleanly after styles are applied
  requestAnimationFrame(() => {
    document.body.classList.add("css-ready");
  });
});
