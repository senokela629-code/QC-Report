"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { 
  Shield, ShieldCheck, Upload, LogOut, UserCheck, Eye, Plus, Trash2, Edit, CheckCircle, 
  XCircle, FileText, Calendar, Package, ArrowRight, Settings, Image as ImageIcon, Camera, X, Info
} from "lucide-react";

interface QCItem {
  id: string;
  photo: string;
  jobs: string[];
  typeItem: string;
  optionQC: "Good" | "Not Good";
  ngReasons: {
    [key: string]: any;
  };
  kurangKomponen: boolean;
  kurangKomponenDetail: string;
  note: string;
}

interface Project {
  projectId: string;
  title: string;
  date: string;
  status: string;
  receiptPhoto: string;
  summaryGood: number;
  summaryNG: number;
  totalPcs: number;
  createdBy: string;
  items: QCItem[];
}

export default function Home() {
  const { data: session, status } = useSession();
  const userRole = (session?.user as any)?.role || "observer";

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobList, setJobList] = useState<string[]>(["REWORK_160_150", "REPLACE_CONNECTOR", "ASSY_UART", "ASSY_TES_BOX", "RETURN"]);
  const [ngReasonList, setNgReasonList] = useState<string[]>(["SPEED MATI", "BLANK", "LECET DIKIT GA NGARUH"]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  
  const [projectStatus, setProjectStatus] = useState("Proses Pengiriman Menuju User");
  const [receiptPhoto, setReceiptPhoto] = useState("");
  const [qcItems, setQcItems] = useState<QCItem[]>([]);

  const [isSettingOpen, setIsSettingOpen] = useState(false);
  const [newJobInput, setNewJobInput] = useState("");
  const [newNgReasonInput, setNewNgReasonInput] = useState("");

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isLegendOpen, setIsLegendOpen] = useState(true);

  useEffect(() => {
    fetchProjects();
    fetchSettings();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (data.success) {
        setProjects(data.projects);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.success) {
        if (data.jobs) setJobList(data.jobs);
        if (data.ngReasons) setNgReasonList(data.ngReasons);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);

          // Kompres ke format JPEG dengan kualitas 70% (0.7)
          resolve(canvas.toDataURL("image/jpeg", 0.7));
        };
      };
      reader.readAsDataURL(file);
    });
  };

  const handleOpenNewProject = () => {
    setEditingProjectId(null);
    setProjectStatus("Proses Pengiriman Menuju User");
    setReceiptPhoto("");
    setQcItems([
      {
        id: "1",
        photo: "",
        jobs: [],
        typeItem: "AE",
        optionQC: "Good",
        ngReasons: {},
        kurangKomponen: false,
        kurangKomponenDetail: "",
        note: ""
      }
    ]);
    setIsModalOpen(true);
  };

  const handleOpenEditProject = (proj: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProjectId(proj.projectId);
    setProjectStatus(proj.status);
    setReceiptPhoto(proj.receiptPhoto);
    setQcItems(JSON.parse(JSON.stringify(proj.items)));
    setIsModalOpen(true);
  };

  const handleAddItem = () => {
    setQcItems((prev) => [
      ...prev,
      {
        id: (prev.length + 1).toString(),
        photo: "",
        jobs: [],
        typeItem: "AE",
        optionQC: "Good",
        ngReasons: {},
        kurangKomponen: false,
        kurangKomponenDetail: "",
        note: ""
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setQcItems((prev) => {
      const updated = prev.filter((_, idx) => idx !== index);
      return updated.map((item, idx) => ({ ...item, id: (idx + 1).toString() }));
    });
  };

  const handleItemChange = (index: number, field: keyof QCItem, value: any) => {
    setQcItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleJobToggle = (index: number, job: string) => {
    setQcItems((prev) => {
      const updated = [...prev];
      const itemToUpdate = { ...updated[index] };
      const currentJobs = Array.isArray(itemToUpdate.jobs) ? [...itemToUpdate.jobs] : [];
      
      if (currentJobs.includes(job)) {
        itemToUpdate.jobs = currentJobs.filter((j) => j !== job);
      } else {
        itemToUpdate.jobs = [...currentJobs, job];
      }
      
      updated[index] = itemToUpdate;
      return updated;
    });
  };

  const handlePhotoUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const compressedStr = await compressImage(file);
      setQcItems((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], photo: compressedStr };
        return updated;
      });
    }
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const compressedStr = await compressImage(file);
      setReceiptPhoto(compressedStr);
    }
  };

  const handleSaveProject = async () => {
    if (qcItems.length === 0) {
      alert("Minimal tambahkan 1 item QC!");
      return;
    }

    let goodCount = 0;
    let ngCount = 0;
    qcItems.forEach((item) => {
      if (item.optionQC === "Good") goodCount++;
      else ngCount++;
    });

    const now = new Date();
    const dateStr = now.toLocaleDateString("id-ID", { day: '2-digit', month: '2-digit', year: 'numeric' });
    const title = `QC - ${dateStr}`;
    const projectId = editingProjectId || `PROJ-${Date.now()}`;

    const projectPayload = {
      projectId,
      title,
      date: now.toISOString(),
      status: projectStatus,
      receiptPhoto,
      summaryGood: goodCount,
      summaryNG: ngCount,
      totalPcs: qcItems.length,
      createdBy: session?.user?.email || "admin",
      items: qcItems,
    };

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectPayload),
      });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        fetchProjects();
      } else {
        alert("Gagal menyimpan project: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan jaringan.");
    }
  };

  const handleAddJobSetting = async () => {
    if (!newJobInput.trim()) return;
    const updatedJobs = [...jobList, newJobInput.trim().toUpperCase().replace(/\s+/g, "_")];
    setJobList(updatedJobs);
    setNewJobInput("");
    await saveAllSettings(updatedJobs, ngReasonList);
  };

  const handleDeleteJobSetting = async (jobToRemove: string) => {
    const updatedJobs = jobList.filter((j) => j !== jobToRemove);
    setJobList(updatedJobs);
    await saveAllSettings(updatedJobs, ngReasonList);
  };

  const handleAddNgReasonSetting = async () => {
    if (!newNgReasonInput.trim()) return;
    const updatedReasons = [...ngReasonList, newNgReasonInput.trim().toUpperCase()];
    setNgReasonList(updatedReasons);
    setNewNgReasonInput("");
    await saveAllSettings(jobList, updatedReasons);
  };

  const handleDeleteNgReasonSetting = async (reasonToRemove: string) => {
    const updatedReasons = ngReasonList.filter((r) => r !== reasonToRemove);
    setNgReasonList(updatedReasons);
    await saveAllSettings(jobList, updatedReasons);
  };

  const saveAllSettings = async (jobs: string[], ngReasons: string[]) => {
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobs, ngReasons }),
    });
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white p-2 rounded-xl flex items-center justify-center shadow-sm">
              <ShieldCheck size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <span className="font-extrabold text-lg text-slate-900 tracking-tight">GR-QC Report</span>
              <span className="hidden sm:inline-block ml-2 text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-medium">
                QC Documentation
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {(userRole === "admin" || userRole === "super_admin") && (
              <button
                onClick={() => setIsSettingOpen(true)}
                className="flex items-center gap-1.5 text-slate-600 hover:text-indigo-600 px-3 py-2 rounded-lg border border-slate-200 hover:border-indigo-200 transition text-sm font-medium"
                title="Setting List Job"
              >
                <Settings size={18} />
                <span className="hidden md:inline">Setting Job</span>
              </button>
            )}

            {status === "loading" ? (
              <div className="text-sm text-slate-400">Memuat...</div>
            ) : !session ? (
              <button
                onClick={() => signIn("google")}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-semibold transition text-sm shadow-sm"
              >
                <UserCheck size={18} />
                LOGIN
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-bold text-slate-800">{session.user?.name}</div>
                  <div className="text-xs text-indigo-600 font-semibold uppercase tracking-wider">
                    Role: {userRole}
                  </div>
                </div>
                <button
                  onClick={() => signOut()}
                  className="flex items-center gap-1 text-slate-600 hover:text-red-600 px-3 py-2 rounded-xl border border-slate-200 hover:border-red-200 transition text-sm font-medium"
                  title="Keluar"
                >
                  <LogOut size={16} />
                  <span className="hidden sm:inline">Keluar</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-2xl p-6 mb-8 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-black mb-2 tracking-tight">
              Dashboard QC Project
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              {userRole === "observer" && "Selamat datang! Anda dapat memantau kategori QC per tanggal beserta detail hasil pemeriksaan produk secara transparan."}
              {(userRole === "admin" || userRole === "super_admin") && "Halo Admin! Buat project baru, upload foto dokumentasi QC, dan kelola status pengiriman barang dengan mudah."}
            </p>
          </div>

          {(userRole === "admin" || userRole === "super_admin") && (
            <button
              onClick={handleOpenNewProject}
              className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-6 py-3 rounded-xl transition shadow-lg shrink-0"
            >
              <Plus size={20} className="stroke-[3]" />
              New Project
            </button>
          )}
        </div>

        {/* Card Panduan / Legenda (Dropdown & Kategori Rapi) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 shadow-xs space-y-4">
          <div 
            onClick={() => setIsLegendOpen(!isLegendOpen)}
            className="flex items-center justify-between cursor-pointer select-none"
          >
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
              <Info className="text-indigo-600" size={18} />
              <span>Keterangan</span>
            </div>
            <button 
              type="button" 
              className="text-xs font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-1.5 transition bg-slate-100 hover:bg-slate-200/70 px-3 py-1.5 rounded-xl"
            >
              <span>{isLegendOpen ? "Sembunyikan" : "Tampilkan"}</span>
              <span className={`transform transition-transform duration-200 ${isLegendOpen ? "rotate-180" : ""}`}>▼</span>
            </button>
          </div>

          {isLegendOpen && (
            <div className="space-y-4 pt-3 border-t border-slate-100 text-xs animate-fadeIn">
              
              {/* Baris 1: Status QC */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                <div className="md:col-span-3 font-extrabold text-slate-700 uppercase tracking-wider text-[11px]">
                  Status QC
                </div>
                <div className="md:col-span-9 flex flex-wrap gap-2.5">
                  <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-2xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                    <span className="font-bold text-emerald-900">GOOD:</span>
                    <span className="text-emerald-700">Produk normal / lulus QC</span>
                  </div>
                  <div className="bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-2xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></span>
                    <span className="font-bold text-rose-900">NOT GOOD:</span>
                    <span className="text-rose-700">Produk memiliki kendala</span>
                  </div>
                </div>
              </div>

              {/* Baris 2: Alasan Kendala (NG) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start pt-2 border-t border-slate-100/80">
                <div className="md:col-span-3 font-extrabold text-slate-700 uppercase tracking-wider text-[11px] pt-1">
                  Alasan Kendala (NG)
                </div>
                <div className="md:col-span-9 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl shadow-2xs">
                    <strong className="text-slate-900 block font-bold">SPEED MATI</strong>
                    <span className="text-slate-600">Angka speed tidak bertambah</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl shadow-2xs">
                    <strong className="text-slate-900 block font-bold">BLANK</strong>
                    <span className="text-slate-600">LCD tidak ada tampilan & lampu navigasi mati</span>
                  </div>
                  {/* Menampilkan alasan NG lain secara dinamis jika ada */}
                  {ngReasonList.filter(r => r !== "SPEED MATI" && r !== "BLANK").map((reason) => (
                    <div key={reason} className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl shadow-2xs">
                      <strong className="text-slate-900 block font-bold">{reason}</strong>
                      <span className="text-slate-600">Kendala terdeteksi pada item</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Baris 3: Model Type */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center pt-2 border-t border-slate-100/80">
                <div className="md:col-span-3 font-extrabold text-slate-700 uppercase tracking-wider text-[11px]">
                  Model Type
                </div>
                <div className="md:col-span-9 flex flex-wrap gap-2.5">
                  <div className="bg-indigo-50/70 border border-indigo-200 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-2xs">
                    <span className="font-bold text-indigo-900 bg-indigo-100 px-2 py-0.5 rounded text-[10px] border border-indigo-200">
                      Type AE
                    </span>
                    <span className="font-semibold text-slate-700">| Vario 150</span>
                  </div>
                  <div className="bg-amber-50/70 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-2xs">
                    <span className="font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded text-[10px] border border-amber-200">
                      Type BA
                    </span>
                    <span className="font-semibold text-slate-700">| Vario 160</span>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>

        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Package className="text-indigo-600" size={20} />
            Daftar Project QC ({projects.length})
          </h2>
          <span className="text-xs font-medium text-slate-500 bg-slate-200/60 px-3 py-1 rounded-full">
            Klik card untuk melihat detail
          </span>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-400 font-medium">Memuat data project...</div>
        ) : projects.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-400">
            <Package size={48} className="mx-auto mb-3 opacity-40" />
            <p className="font-semibold text-slate-700">Belum ada Project QC</p>
            <p className="text-xs text-slate-400 mt-1">Admin dapat membuat project baru melalui tombol di atas.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((proj) => {
              // Hitung rekap jumlah job dari semua item dalam project ini
              const jobCounts: { [key: string]: number } = {};
              proj.items.forEach((item) => {
                if (item.jobs && Array.isArray(item.jobs)) {
                  item.jobs.forEach((job) => {
                    jobCounts[job] = (jobCounts[job] || 0) + 1;
                  });
                }
              });

              return (
                <div
                  key={proj.projectId}
                  onClick={() => setSelectedProject(proj)}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-lg transition cursor-pointer overflow-hidden flex flex-col group relative"
                >
                  <div className="p-5 border-b border-slate-100 flex items-start justify-between">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-lg group-hover:text-indigo-600 transition">
                        {proj.title}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                        <Calendar size={14} />
                        {new Date(proj.date).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                        proj.status === "Done Payment"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {proj.status}
                    </span>
                  </div>

                  <div className="p-4 bg-slate-50/50 grid grid-cols-4 gap-2">
                    {proj.items.slice(0, 4).map((item, idx) => (
                      <div key={idx} className="aspect-square bg-slate-200 rounded-lg overflow-hidden relative border border-slate-200">
                        {item.photo ? (
                          <img src={item.photo} alt={`QC ${item.id}`} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <ImageIcon size={16} />
                          </div>
                        )}
                        <span className="absolute bottom-0.5 right-0.5 bg-black/60 text-white text-[9px] px-1 rounded">
                          #{item.id}
                        </span>
                      </div>
                    ))}
                    {proj.items.length > 4 && (
                      <div className="aspect-square bg-slate-200 rounded-lg flex items-center justify-center text-xs font-bold text-slate-600">
                        +{proj.items.length - 4}
                      </div>
                    )}
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div className="space-y-3 mb-4">
                      {/* Grid Ringkasan Total, Good, Not Good */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-slate-100 p-2 rounded-xl">
                          <div className="text-[10px] uppercase font-bold text-slate-500">Total</div>
                          <div className="text-base font-black text-slate-800">{proj.totalPcs} Pcs</div>
                        </div>
                        <div className="bg-emerald-50 p-2 rounded-xl">
                          <div className="text-[10px] uppercase font-bold text-emerald-600">Good</div>
                          <div className="text-base font-black text-emerald-700">{proj.summaryGood}</div>
                        </div>
                        <div className="bg-rose-50 p-2 rounded-xl">
                          <div className="text-[10px] uppercase font-bold text-rose-600">Not Good</div>
                          <div className="text-base font-black text-rose-700">{proj.summaryNG}</div>
                        </div>
                      </div>

                      {/* Rekapitulasi Job */}
                      <div className="bg-indigo-50/50 border border-indigo-100 p-2.5 rounded-xl">
                        <div className="text-[10px] uppercase font-bold text-indigo-600 mb-1.5">Rekap Job:</div>
                        {Object.keys(jobCounts).length === 0 ? (
                          <div className="text-xs text-slate-400">-</div>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(jobCounts).map(([jobName, count]) => (
                              <span key={jobName} className="text-[10px] bg-white border border-indigo-200 text-indigo-900 font-semibold px-2 py-0.5 rounded-md shadow-2xs">
                                {jobName} : <strong className="text-indigo-600">{count}</strong>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-xs text-indigo-600 font-bold group-hover:underline flex items-center gap-1">
                        Lihat Detail QC <ArrowRight size={14} />
                      </span>
                      {(userRole === "admin" || userRole === "super_admin") && (
                        <button
                          onClick={(e) => handleOpenEditProject(proj, e)}
                          className="text-slate-500 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
                          title="Edit Project"
                        >
                          <Edit size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        GR-QC Report &bull; Platform Dokumentasi Quality Control
      </footer>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <h3 className="font-extrabold text-lg flex items-center gap-2">
                <Package size={20} className="text-indigo-400" />
                {editingProjectId ? "Edit Project QC" : "New Project QC"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
                <h4 className="font-bold text-slate-800 text-sm">Status & Pengiriman Project</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Status Project</label>
                    <select
                      value={projectStatus}
                      onChange={(e) => setProjectStatus(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Proses Pengiriman Menuju User">Proses Pengiriman Menuju User</option>
                      <option value="Done Payment">Done Payment</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Upload Resi Paket {projectStatus.includes("Pengiriman") && <span className="text-indigo-600 font-bold">(Opsional)</span>}
                    </label>
                    <div className="flex items-center gap-3">
                      <label className="cursor-pointer bg-white border border-slate-300 hover:border-indigo-500 text-slate-700 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-2xs">
                        <Upload size={14} /> Pilih Foto Resi
                        <input type="file" accept="image/*" onChange={handleReceiptUpload} className="hidden" />
                      </label>
                      {receiptPhoto && (
                        <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle size={14} /> Resi Terlampir
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {receiptPhoto && (
                  <div className="mt-2 relative w-32 h-20 rounded-xl overflow-hidden border border-slate-300">
                    <img src={receiptPhoto} alt="Resi" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setReceiptPhoto("")}
                      className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full text-xs shadow"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-sm">Dokumentasi Hasil QC ({qcItems.length} Pcs)</h4>
                </div>

                {qcItems.map((item, index) => (
                  <div key={index} className="bg-white border-2 border-slate-200 rounded-2xl p-4 sm:p-5 relative space-y-4 shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <span className="bg-indigo-600 text-white font-black text-xs px-3 py-1 rounded-full">
                        #{item.id}
                      </span>
                      {qcItems.length > 1 && (
                        <button
                          onClick={() => handleRemoveItem(index)}
                          className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition"
                          title="Hapus Item"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Kolom 1: Foto Dokumentasi */}
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-slate-700">Foto Dokumentasi * (Original Quality)</label>
                        <div className="aspect-video md:aspect-square bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center overflow-hidden relative group">
                          {item.photo ? (
                            <>
                              <img src={item.photo} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                              <label className="absolute inset-0 bg-black/50 text-white flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition cursor-pointer text-xs font-bold">
                                <Camera size={16} /> Ganti Foto
                                <input type="file" accept="image/*" capture="environment" onChange={(e) => handlePhotoUpload(index, e)} className="hidden" />
                              </label>
                            </>
                          ) : (
                            <label className="cursor-pointer flex flex-col items-center justify-center p-4 text-center w-full h-full hover:bg-slate-200/50 transition">
                              <Camera size={28} className="text-slate-400 mb-1" />
                              <span className="text-xs font-bold text-slate-600">Ambil / Upload Foto</span>
                              <span className="text-[10px] text-slate-400">Galeri atau Kamera (Kualitas Asli)</span>
                              <input type="file" accept="image/*" capture="environment" onChange={(e) => handlePhotoUpload(index, e)} className="hidden" />
                            </label>
                          )}
                        </div>
                      </div>

                      {/* Kolom 2: Check Job */}
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-slate-700">Check Job (Pilih min. 1) *</label>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 max-h-48 overflow-y-auto">
                          {jobList.map((job) => (
                            <label key={job} className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={Boolean(item.jobs && item.jobs.includes(job))}
                                onChange={() => handleJobToggle(index, job)}
                                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                              />
                              {job}
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Kolom 3: Type, Option QC, Alasan Not Good, dan Komponen Kurang */}
                      <div className="flex flex-col gap-3">
                        {/* Selector Type */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-slate-700">Type *</label>
                          <div className="grid grid-cols-2 gap-2">
                            {["AE", "BA"].map((t) => {
                              const isSelected = item.typeItem === t;
                              let activeColor = "bg-indigo-600 text-white shadow-sm"; // Ungu untuk AE
                              if (t === "BA") {
                                activeColor = "bg-amber-600 text-white shadow-sm"; // Oranye/Amber kontras untuk BA
                              }

                              return (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={() => handleItemChange(index, "typeItem", t)}
                                  className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center transition ${
                                    isSelected
                                      ? activeColor
                                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                  }`}
                                >
                                  {t}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Selector Option QC */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-slate-700">Option QC *</label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => handleItemChange(index, "optionQC", "Good")}
                              className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                                item.optionQC === "Good"
                                  ? "bg-emerald-600 text-white shadow-sm"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              <CheckCircle size={14} /> Good
                            </button>
                            <button
                              type="button"
                              onClick={() => handleItemChange(index, "optionQC", "Not Good")}
                              className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                                item.optionQC === "Not Good"
                                  ? "bg-rose-600 text-white shadow-sm"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              <XCircle size={14} /> Not Good
                            </button>
                          </div>
                        </div>

                        {/* Alasan Not Good */}
                        {item.optionQC === "Not Good" && (
                          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 space-y-2">
                            <span className="text-[11px] font-bold text-rose-800 block">Alasan Not Good:</span>
                            {ngReasonList.map((reason) => {
                              const isChecked = Boolean(item.ngReasons?.[reason]);
                              return (
                                <div key={reason} className="space-y-1">
                                  <label className="flex items-center gap-2 text-xs text-rose-900 font-medium cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        const checked = e.target.checked;
                                        handleItemChange(index, "ngReasons", {
                                          ...(item.ngReasons || {}),
                                          [reason]: checked,
                                        });
                                      }}
                                      className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                                    />
                                    {reason}
                                  </label>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Kotak Komponen Kurang (Universal) */}
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                          <label className="flex items-center gap-2 text-xs text-amber-900 font-semibold cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(item.kurangKomponen)}
                              onChange={(e) => handleItemChange(index, "kurangKomponen", e.target.checked)}
                              className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                            />
                            Komponen Kurang (Universal)
                          </label>
                          {item.kurangKomponen && (
                            <input
                              type="text"
                              placeholder="Detail komponen yang kurang..."
                              value={item.kurangKomponenDetail || ""}
                              onChange={(e) => handleItemChange(index, "kurangKomponenDetail", e.target.value)}
                              className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Note (Opsional)</label>
                      <input
                        type="text"
                        placeholder="Catatan tambahan untuk item ini..."
                        value={item.note}
                        onChange={(e) => handleItemChange(index, "note", e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                ))}

                <div className="pt-2">
                  <button
                    onClick={handleAddItem}
                    className="w-full py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-2 border-dashed border-indigo-300 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-2xs"
                  >
                    <Plus size={16} /> Tambah Item QC (+)
                  </button>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProject}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold transition shadow-md"
              >
                Save Project
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-extrabold text-lg">{selectedProject.title}</h3>
                <span className="text-xs text-slate-400">
                  Dibuat oleh: {selectedProject.createdBy} &bull; {new Date(selectedProject.date).toLocaleDateString("id-ID", { dateStyle: "long" })}
                </span>
              </div>
              <button
                onClick={() => setSelectedProject(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-xs text-slate-500 block mb-1 font-semibold">Status Project:</span>
                  <span className={`text-sm font-extrabold px-3 py-1 rounded-full inline-block ${
                    selectedProject.status === "Done Payment" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                  }`}>
                    {selectedProject.status}
                  </span>
                </div>

                {selectedProject.receiptPhoto && (
                  <div>
                    <span className="text-xs text-slate-500 block mb-1 font-semibold">Foto Resi (Kualitas Asli):</span>
                    <a href={selectedProject.receiptPhoto} target="_blank" rel="noreferrer" className="block w-24 h-16 rounded-lg overflow-hidden border border-slate-300 hover:opacity-90 transition">
                      <img src={selectedProject.receiptPhoto} alt="Resi" className="w-full h-full object-cover" />
                    </a>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-slate-800 text-sm">Daftar Item QC ({selectedProject.items.length} Pcs)</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedProject.items.map((item, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-start shadow-2xs">
                      {/* Foto Item */}
                      <div className="w-full sm:w-28 h-28 bg-slate-200 rounded-xl overflow-hidden relative shrink-0 border border-slate-300">
                        {item.photo ? (
                          <img src={item.photo} alt={`Item ${item.id}`} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">No Photo</div>
                        )}
                        <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                          #{item.id}
                        </span>
                      </div>

                      {/* Informasi Detail Item */}
                      <div className="flex-1 space-y-2 w-full">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-slate-900 text-sm">Item #{item.id}</h4>
                          
                          {/* Status Good/Not Good & Badge Khusus RETURN di bawahnya */}
                          <div className="flex flex-col items-end gap-1.5">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                              item.optionQC === "Good" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                            }`}>
                              {item.optionQC === "Good" ? <CheckCircle size={12} /> : <XCircle size={12} />}
                              {item.optionQC}
                            </span>

                            {/* Badge Khusus untuk Job RETURN */}
                            {item.jobs && item.jobs.includes("RETURN") && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 shadow-2xs">
                                RETURN
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Badge Type (Ungu untuk AE, Amber untuk BA) */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            item.typeItem === "BA" 
                              ? "bg-amber-50 text-amber-800 border-amber-200" 
                              : "bg-indigo-50 text-indigo-700 border-indigo-100"
                          }`}>
                            Type: {item.typeItem || "AE"}
                          </span>
                        </div>

                        {/* Daftar Job Lainnya (RETURN disaring karena sudah ada badge khusus) */}
                        <div className="text-xs text-slate-700">
                          <strong className="text-slate-900">Job:</strong>{" "}
                          {item.jobs && item.jobs.filter(j => j !== "RETURN").length > 0 
                            ? item.jobs.filter(j => j !== "RETURN").join(", ") 
                            : (item.jobs?.length === 1 && item.jobs.includes("RETURN") ? "-" : "-")}
                        </div>

                        {/* Alasan Not Good (Jika ada) */}
                        {item.optionQC === "Not Good" && item.ngReasons && Object.keys(item.ngReasons).length > 0 && (
                          <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2 rounded-xl">
                            <strong className="font-bold">Alasan Not Good:</strong>{" "}
                            {Object.entries(item.ngReasons)
                              .filter(([_, val]) => val)
                              .map(([reason]) => reason)
                              .join(", ") || "-"}
                          </div>
                        )}

                        {/* Komponen Kurang Universal (Jika ada) */}
                        {item.kurangKomponen && (
                          <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 p-2 rounded-xl">
                            <strong className="font-bold">Komponen Kurang:</strong> {item.kurangKomponenDetail || "Ya"}
                          </div>
                        )}

                        {/* Catatan / Note (Jika ada) */}
                        {item.note && (
                          <div className="text-xs text-slate-600 italic">
                            <strong>Note:</strong> {item.note}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex items-center justify-end shrink-0">
              <button
                onClick={() => setSelectedProject(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {isSettingOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full flex flex-col shadow-2xl overflow-hidden my-auto max-h-[85vh]">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <h3 className="font-extrabold text-lg flex items-center gap-2">
                <Settings size={20} className="text-indigo-400" />
                Pengaturan Sistem QC
              </h3>
              <button
                onClick={() => setIsSettingOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Bagian 1: List Job */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 text-sm border-b pb-1">Daftar List Job QC</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nama Job Baru (misal: ASSY_LCD)"
                    value={newJobInput}
                    onChange={(e) => setNewJobInput(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={handleAddJobSetting}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition"
                  >
                    Tambah Job
                  </button>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {jobList.map((job) => (
                    <div key={job} className="flex items-center justify-between bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-800">
                      <span>{job}</span>
                      {jobList.length > 1 && (
                        <button onClick={() => handleDeleteJobSetting(job)} className="text-slate-400 hover:text-red-600 p-1 rounded transition">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Bagian 2: List Alasan Not Good */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 text-sm border-b pb-1">Daftar Alasan Not Good</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Alasan Baru (misal: LECET_BODY)"
                    value={newNgReasonInput}
                    onChange={(e) => setNewNgReasonInput(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <button
                    onClick={handleAddNgReasonSetting}
                    className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition"
                  >
                    Tambah Alasan
                  </button>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {ngReasonList.map((reason) => (
                    <div key={reason} className="flex items-center justify-between bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-800">
                      <span>{reason}</span>
                      {ngReasonList.length > 1 && (
                        <button onClick={() => handleDeleteNgReasonSetting(reason)} className="text-slate-400 hover:text-red-600 p-1 rounded transition">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex items-center justify-end shrink-0">
              <button
                onClick={() => setIsSettingOpen(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}