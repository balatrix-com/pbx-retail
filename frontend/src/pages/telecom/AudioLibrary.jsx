import { useState, useEffect } from 'react';
import { Play, Trash2, Upload, FileAudio, Search, RefreshCw, X } from 'lucide-react';
import api from '../../services/api';

const AudioLibrary = () => {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

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

    const filteredFiles = files.filter(f =>
        f.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.filename.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            <div className="flex justify-between items-center mb-2">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Audio Library</h1>
                    <p className="text-gray-500 mt-1 font-medium">Manage IVR greetings and system prompts.</p>
                </div>
                <button
                    onClick={() => setShowUploadModal(true)}
                    className="inline-flex items-center justify-center rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-primary-700 transition-all active:scale-[0.98]"
                >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Audio
                </button>
            </div>

            {/* Toolbar */}
            <div className="flex justify-between items-center space-x-4">
                <div className="relative w-full max-w-md">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search audio files..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full rounded-xl border-0 py-2.5 pl-10 pr-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 font-medium bg-white transition-all"
                    />
                </div>
                <button
                    onClick={fetchFiles}
                    className="p-2.5 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 transition-colors focus:outline-none ring-1 ring-inset ring-gray-200 bg-white shadow-sm"
                    title="Refresh Library"
                >
                    <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin text-primary-600' : ''}`} />
                </button>
            </div>

            {/* Files List */}
            <div className="bg-white shadow-sm ring-1 ring-gray-100 sm:rounded-2xl overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50/50 border-b border-gray-100">
                        <tr>
                            <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Name</th>
                            <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Filename</th>
                            <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Size</th>
                            <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Uploaded At</th>
                            <th className="text-right px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {loading && files.length === 0 ? (
                            <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500 font-medium text-sm">Loading library...</td></tr>
                        ) : filteredFiles.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-16 text-center">
                                    <FileAudio className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                                    <h3 className="mt-2 text-sm font-semibold text-gray-900">No audio files found</h3>
                                    <p className="mt-1 text-sm text-gray-500">Upload your first audio prompt to get started.</p>
                                </td>
                            </tr>
                        ) : (
                            filteredFiles.map(file => (
                                <tr key={file.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-primary-50 ring-1 ring-inset ring-primary-100/50 flex items-center justify-center text-primary-700 shadow-sm shrink-0">
                                                <FileAudio className="h-5 w-5" />
                                            </div>
                                            <span className="font-bold text-gray-900 text-sm">{file.name || 'Untitled'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono font-medium">{file.filename}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">{formatSize(file.size)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">{formatDate(file.createdAt)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                        <button
                                            onClick={() => handleDelete(file.id)}
                                            className="inline-flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-red-700 hover:bg-red-50 transition-colors focus:outline-none ring-1 ring-transparent hover:ring-red-100"
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
            </div>

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl ring-1 ring-gray-200 w-full max-w-md overflow-hidden transform transition-all">

                        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900">Upload Audio</h3>
                            <button
                                type="button"
                                onClick={() => setShowUploadModal(false)}
                                className="text-gray-400 hover:text-gray-500 focus:outline-none"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleUpload} className="p-6">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Friendly Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm font-medium bg-gray-50/50 hover:bg-white transition-colors"
                                        placeholder="e.g. Main Greeting"
                                        value={uploadName}
                                        onChange={(e) => setUploadName(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Audio File</label>
                                    <div className={`mt-2 flex justify-center rounded-xl border-2 border-dashed px-6 py-10 transition-colors cursor-pointer relative ${selectedFile ? 'border-primary-300 bg-primary-50' : 'border-gray-300 hover:border-primary-500 hover:bg-primary-50'}`}>
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
                                                    <FileAudio className="mx-auto h-12 w-12 text-primary-600" aria-hidden="true" />
                                                    <div className="mt-4 flex flex-col text-sm leading-6 text-primary-700 font-bold">
                                                        <span>{selectedFile.name}</span>
                                                        <span className="text-primary-500 font-medium text-xs mt-1">{formatSize(selectedFile.size)}</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="mx-auto h-12 w-12 text-gray-300" aria-hidden="true" />
                                                    <div className="mt-4 flex text-sm leading-6 text-gray-600 font-medium">
                                                        <span>Upload a file</span>
                                                        <span className="pl-1">or drag and drop</span>
                                                    </div>
                                                    <p className="text-xs leading-5 text-gray-500">WAV or MP3 up to 10MB</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setShowUploadModal(false)}
                                    className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 hover:ring-gray-400 transition-all focus:outline-none"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploading || !selectedFile}
                                    className="inline-flex justify-center items-center rounded-xl border border-transparent bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:shadow-md hover:bg-primary-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
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
