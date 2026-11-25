import { useState, useEffect } from 'react';
import { Play, Trash2, Upload, FileAudio, Search, RefreshCw, X, HardDrive, Music, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';
import Pagination from '../../components/common/Pagination';
import CreativeStatCard from '../../components/common/CreativeStatCard';
import { clsx } from 'clsx';

const AudioLibrary = () => {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);

    // Upload Form State
    const [uploadName, setUploadName] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);

    useEffect(() => {
        fetchFiles();
    }, []);

    const fetchFiles = async () => {
        try {
            setLoading(true);
            const res = await api.get('/telecom/audio/list');
            setFiles(res.data.files || []);
        } catch (err) {
            console.error('Failed to fetch audio files:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
            // Auto-fill name if empty
            if (!uploadName) {
                const name = e.target.files[0].name.split('.')[0];
                setUploadName(name.replace(/_/g, ' ').replace(/-/g, ' '));
            }
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!selectedFile) return;

        if (selectedFile.size > 10 * 1024 * 1024) {
            alert('File size exceeds maximum limit of 10MB');
            return;
        }

        try {
            setUploading(true);
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('name', uploadName);

            await api.post('/telecom/audio/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Reset and refresh
            setShowUploadModal(false);
            setUploadName('');
            setSelectedFile(null);
            fetchFiles();
        } catch (err) {
            console.error('Upload failed:', err);
            alert('Upload failed: ' + (err.response?.data?.message || err.message));
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this audio file?')) return;

        try {
            await api.delete(`/telecom/audio/${id}`);
            setFiles(prev => prev.filter(f => f.id !== id));
        } catch (err) {
            console.error('Delete failed:', err);
            alert('Delete failed');
        }
    };

    const formatSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    const totalBytes = files.reduce((acc, curr) => acc + (curr.size || 0), 0);

    const filteredFiles = files.filter(f =>
        f.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.filename.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const paginatedFiles = filteredFiles.slice((page - 1) * limit, page * limit);

    return (
        <div className="w-full pb-16 space-y-7 animate-in fade-in duration-300 max-w-7xl mx-auto">
            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 p-8 text-white shadow-xl shadow-teal-900/15">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="space-y-1.5 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide border border-white/20">
                            <FileAudio size={14} className="text-teal-200 animate-pulse" />
                            <span>Media Assets & Voice Prompts</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                            Audio Library
                        </h1>
                        <p className="text-teal-100 text-xs sm:text-sm font-medium">
                            Manage IVR greetings, on-hold music, voicemail announcements, and custom system prompts.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={fetchFiles}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-2xl bg-white/15 hover:bg-white/25 text-white backdrop-blur-md border border-white/20 transition-all active:scale-95 cursor-pointer"
                        >
                            <RefreshCw size={14} className={clsx(loading && "animate-spin")} />
                            <span>Refresh</span>
                        </button>
                        <button
                            onClick={() => setShowUploadModal(true)}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white hover:bg-teal-50 px-5 py-2.5 text-xs font-bold text-teal-800 shadow-lg shadow-black/10 transition-all active:scale-95 cursor-pointer"
                        >
                            <Upload size={16} className="text-teal-700" />
                            <span>Upload Audio</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick KPI Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <CreativeStatCard
                    title="Total Files"
                    value={files.length}
                    subtitle="Uploaded recordings"
                    icon={FileAudio}
                    color="blue"
                    trend="+12%"
                    trendUp={true}
                />
                <CreativeStatCard
                    title="Storage Footprint"
                    value={formatSize(totalBytes)}
                    subtitle="Cloud storage used"
                    icon={HardDrive}
                    color="purple"
                    trend="+8%"
                    trendUp={true}
                />
                <CreativeStatCard
                    title="Storage Status"
                    value="Healthy & Synced"
                    subtitle="FreeSWITCH media directory"
                    icon={CheckCircle2}
                    color="emerald"
                    trend="Optimal"
                    trendUp={true}
                />
            </div>

            {/* Unified search bar */}
            <div className="bg-white dark:bg-[#0c0d12] p-3 rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-xs">
                <div className="relative max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
                    <input
                        type="text"
                        placeholder="Search audio prompts by name or filename..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-gray-50/80 dark:bg-white/[0.03] border border-gray-200/80 dark:border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all font-medium"
                    />
                </div>
            </div>

            {/* Files Table */}
            <div className="bg-white dark:bg-[#0c0d12] rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-xs overflow-hidden">
                <table className="w-full divide-y divide-gray-100 dark:divide-white/5">
                    <thead className="bg-gray-50/75 dark:bg-white/[0.02]">
                        <tr>
                            <th className="text-left px-6 py-4 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Audio Prompt</th>
                            <th className="text-left px-6 py-4 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Filename</th>
                            <th className="text-left px-6 py-4 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Size</th>
                            <th className="text-left px-6 py-4 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Uploaded At</th>
                            <th className="text-right px-6 py-4 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5 bg-transparent">
                        {loading && files.length === 0 ? (
                            <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-400 font-medium text-sm">Loading audio library...</td></tr>
                        ) : filteredFiles.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-16 text-center">
                                    <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl w-14 h-14 mx-auto mb-3 flex items-center justify-center">
                                        <FileAudio className="h-7 w-7 text-gray-400 dark:text-gray-500" />
                                    </div>
                                    <h3 className="text-base font-bold text-gray-900 dark:text-white">No audio files found</h3>
                                    <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium text-sm">Upload your first audio prompt or adjust your search.</p>
                                </td>
                            </tr>
                        ) : (
                            paginatedFiles.map(file => (
                                <tr key={file.id} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-950/40 border border-primary-100 dark:border-primary-800/30 flex items-center justify-center text-primary-600 dark:text-primary-400 shrink-0">
                                                <FileAudio className="h-4 w-4" />
                                            </div>
                                            <span className="font-bold text-gray-900 dark:text-white text-sm">{file.name || 'Untitled'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono font-medium">{file.filename}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-medium">{formatSize(file.size)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-medium">{formatDate(file.createdAt)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                        <button
                                            onClick={() => handleDelete(file.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all"
                                            title="Delete Audio"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                <Pagination
                    page={page}
                    limit={limit}
                    total={filteredFiles.length}
                    onPageChange={setPage}
                    onLimitChange={(newLimit) => {
                        setLimit(newLimit);
                        setPage(1);
                    }}
                    itemName="audio files"
                />
            </div>

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-[#0e0f17] rounded-3xl shadow-2xl border border-gray-200/80 dark:border-white/10 w-full max-w-md overflow-hidden transform transition-all">
                        <div className="px-6 py-5 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02] flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Upload Audio</h3>
                            <button
                                type="button"
                                onClick={() => setShowUploadModal(false)}
                                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleUpload} className="p-6">
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Friendly Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-gray-50/80 dark:bg-white/[0.03] border border-gray-200/80 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary-500 transition-all font-medium"
                                        placeholder="e.g. Main Greeting"
                                        value={uploadName}
                                        onChange={(e) => setUploadName(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Audio File</label>
                                    <div className={`mt-2 flex justify-center rounded-2xl border-2 border-dashed px-6 py-10 transition-colors cursor-pointer relative ${selectedFile ? 'border-primary-500 bg-primary-50/30 dark:bg-primary-950/20' : 'border-gray-200 dark:border-white/10 hover:border-primary-500'}`}>
                                        <input
                                            type="file"
                                            accept=".wav,.mp3"
                                            required
                                            onChange={handleFileSelect}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        <div className="text-center">
                                            {selectedFile ? (
                                                <>
                                                    <FileAudio className="mx-auto h-12 w-12 text-primary-600 dark:text-primary-400" />
                                                    <div className="mt-3 flex flex-col text-sm text-primary-700 dark:text-primary-300 font-bold">
                                                        <span>{selectedFile.name}</span>
                                                        <span className="text-primary-500 text-xs mt-1 font-mono">{formatSize(selectedFile.size)}</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="mx-auto h-10 w-10 text-gray-400" />
                                                    <div className="mt-3 text-sm text-gray-600 dark:text-gray-300 font-medium">
                                                        <span>Upload a file</span> or drag and drop
                                                    </div>
                                                    <p className="text-xs text-gray-400 mt-1">WAV or MP3 up to 10MB</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex justify-end gap-3 pt-5 border-t border-gray-100 dark:border-white/5">
                                <button
                                    type="button"
                                    onClick={() => setShowUploadModal(false)}
                                    className="rounded-xl bg-white dark:bg-[#181924] px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 border border-gray-200/80 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploading || !selectedFile}
                                    className="inline-flex justify-center items-center rounded-xl bg-primary-600 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-primary-600/20 hover:bg-primary-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {uploading ? 'Uploading...' : 'Upload Audio'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AudioLibrary;
