"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { 
  Shield, Upload, LogOut, UserCheck, Eye, Plus, Trash2, Edit, CheckCircle, 
  XCircle, FileText, Calendar, Package, ArrowRight, Settings, Image as ImageIcon, Camera, X
} from "lucide-react";

interface QCItem {
  id: string;
  photo: string;
  jobs: string[];
  optionQC: "Good" | "Not Good";
  ngReasons: {
    speedMati: boolean;
    blank: boolean;
    komponenKurang: boolean;
    komponenDetail: string;
  };
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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  
  const [projectStatus, setProjectStatus] = useState("Proses Pengiriman Menuju User");
  const [receiptPhoto, setReceiptPhoto] = useState("");
  const [qcItems, setQcItems] = useState<QCItem[]>([]);

  const [isSettingOpen, setIsSettingOpen] = useState(false);
  const [newJobInput, setNewJobInput] = useState("");

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

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
      if (data.success && data.jobs) {
        setJobList(data.jobs);
      }
    } catch (err) {
      console.error(err);
    }
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
        optionQC: "Good",
        ngReasons: { speedMati: false, blank: false, komponenKurang: false, komponenDetail: "" },
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
        optionQC: "Good",
        ngReasons: { speedMati: false, blank: false, komponenKurang: false, komponenDetail: "" },
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

  const handlePhotoUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const resultStr = reader.result as string;
        setQcItems((prev) => {
          const updated = [...prev];
          updated[index] = { ...updated[index], photo: resultStr };
          return updated;
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
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
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobs: updatedJobs }),
    });
  };

  const handleDeleteJobSetting = async (jobToRemove: string) => {
    const updatedJobs = jobList.filter((j) => j !== jobToRemove);
    setJobList(updatedJobs);
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobs: updatedJobs }),
    });
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white font-black px-3 py-1.5 rounded-xl text-lg shadow-sm">
              GR
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
                Minta Akses
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
            {projects.map((proj) => (
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
                  <div className="grid grid-cols-3 gap-2 text-center mb-4">
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
            ))}
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

                      <div className="flex flex-col gap-3">
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

                        {item.optionQC === "Not Good" && (
                          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 space-y-2">
                            <span className="text-[11px] font-bold text-rose-800 block">Alasan Not Good:</span>
                            <label className="flex items-center gap-2 text-xs text-rose-900 font-medium">
                              <input
                                type="checkbox"
                                checked={item.ngReasons.speedMati}
                                onChange={(e) => handleItemChange(index, "ngReasons", { ...item.ngReasons, speedMati: e.target.checked })}
                                className="rounded text-rose-600 focus:ring-rose-500"
                              />
                              SPEED MATI
                            </label>
                            <label className="flex items-center gap-2 text-xs text-rose-900 font-medium">
                              <input
                                type="checkbox"
                                checked={item.ngReasons.blank}
                                onChange={(e) => handleItemChange(index, "ngReasons", { ...item.ngReasons, blank: e.target.checked })}
                                className="rounded text-rose-600 focus:ring-rose-500"
                              />
                              BLANK
                            </label>
                            <label className="flex items-center gap-2 text-xs text-rose-900 font-medium">
                              <input
                                type="checkbox"
                                checked={item.ngReasons.komponenKurang}
                                onChange={(e) => handleItemChange(index, "ngReasons", { ...item.ngReasons, komponenKurang: e.target.checked })}
                                className="rounded text-rose-600 focus:ring-rose-500"
                              />
                              KOMPONEN KURANG
                            </label>

                            {item.ngReasons.komponenKurang && (
                              <input
                                type="text"
                                placeholder="Beritahu komponen apa yang kurang"
                                value={item.ngReasons.komponenDetail}
                                onChange={(e) => handleItemChange(index, "ngReasons", { ...item.ngReasons, komponenDetail: e.target.value })}
                                className="w-full bg-white border border-rose-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
                              />
                            )}
                          </div>
                        )}
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
                    <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-4 flex gap-4 shadow-2xs">
                      <div className="w-28 h-28 bg-slate-100 rounded-xl overflow-hidden shrink-0 border border-slate-200 relative group">
                        {item.photo ? (
                          <>
                            <img src={item.photo} alt={`Item ${item.id}`} className="w-full h-full object-cover" />
                            <a 
                              href={item.photo} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[10px] font-bold underline"
                            >
                              Buka Asli
                            </a>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <ImageIcon size={20} />
                          </div>
                        )}
                        <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-bold pointer-events-none">
                          #{item.id}
                        </span>
                      </div>

                      <div className="flex-1 flex flex-col justify-between text-xs space-y-1">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-900">Item #{item.id}</span>
                            <span className={`px-2 py-0.5 rounded-full font-bold ${
                              item.optionQC === "Good" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                            }`}>
                              {item.optionQC}
                            </span>
                          </div>

                          <div className="text-slate-600 font-medium mb-1">
                            <strong className="text-slate-800">Job:</strong> {item.jobs && item.jobs.length > 0 ? item.jobs.join(", ") : "-"}
                          </div>

                          {item.optionQC === "Not Good" && item.ngReasons && (
                            <div className="text-rose-700 font-medium bg-rose-50 p-1.5 rounded-lg mb-1">
                              <div><strong>Alasan:</strong> {[
                                item.ngReasons.speedMati && "Speed Mati",
                                item.ngReasons.blank && "Blank",
                                item.ngReasons.komponenKurang && `Komponen Kurang (${item.ngReasons.komponenDetail || ""})`
                              ].filter(Boolean).join(", ") || "-"}</div>
                            </div>
                          )}

                          {item.note && (
                            <div className="text-slate-500 italic">
                              &ldquo;{item.note}&rdquo;
                            </div>
                          )}
                        </div>
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
          <div className="bg-white rounded-3xl max-w-md w-full flex flex-col shadow-2xl overflow-hidden my-auto">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <h3 className="font-extrabold text-lg flex items-center gap-2">
                <Settings size={20} className="text-indigo-400" />
                Pengaturan List Job QC
              </h3>
              <button
                onClick={() => setIsSettingOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
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
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-2xs"
                >
                  Tambah
                </button>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Daftar Job Aktif:</span>
                {jobList.map((job) => (
                  <div key={job} className="flex items-center justify-between bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-medium text-slate-800">
                    <span>{job}</span>
                    {jobList.length > 1 && (
                      <button
                        onClick={() => handleDeleteJobSetting(job)}
                        className="text-slate-400 hover:text-red-600 p-1 rounded transition"
                        title="Hapus Job"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
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