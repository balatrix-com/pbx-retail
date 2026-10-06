import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Loader2, CheckCircle, Phone, ArrowRight } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const TfnOnboardingPage = () => {
    const navigate = useNavigate();
    const { user, refreshUser } = useAuth();
    const { addToast } = useToast();
    
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState(null);
    const [availableTfns, setAvailableTfns] = useState([]);
    const [selectedTfnIds, setSelectedTfnIds] = useState([]);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [statusRes, tfnsRes] = await Promise.all([
                api.get('/onboarding/auth/status'),
                api.get('/onboarding/auth/available-tfns')
            ]);
            
            setStatus(statusRes.data);
            setAvailableTfns(tfnsRes.data);
            
            if (!statusRes.data.needsTfn) {
                navigate('/dashboard');
            }
        } catch (err) {
            console.error(err);
            addToast('error', 'Failed to load onboarding status');
        } finally {
            setLoading(false);
        }
    };

    const toggleTfnSelection = (id) => {
        const remainingAllowance = status.maxTfns - status.currentTfns;
        
        setSelectedTfnIds(prev => {
            if (prev.includes(id)) {
                return prev.filter(i => i !== id);
            }
            if (prev.length < remainingAllowance) {
                return [...prev, id];
            }
            addToast('warning', `You can only select up to ${remainingAllowance} more numbers.`);
            return prev;
        });
    };

    const handleSelect = async () => {
        if (selectedTfnIds.length === 0) return;
        
        setProcessing(true);
        try {
            // Assign each one by one (or update API to support multiple)
            for (const tfnId of selectedTfnIds) {
                await api.post('/onboarding/auth/select-tfn', { tfnId });
            }
            
            addToast('success', `${selectedTfnIds.length} number(s) assigned successfully!`);
            await refreshUser();
            navigate('/dashboard');
        } catch (err) {
            console.error(err);
            addToast('error', err.response?.data?.message || 'Failed to assign phone numbers');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
        );
    }

    const remainingToSelect = status?.maxTfns - status?.currentTfns;

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-3xl w-full">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-2xl mb-4">
                        <Phone className="w-8 h-8 text-primary-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900">Choose your Phone Numbers</h1>
                    <p className="text-slate-600 mt-2">
                        Your plan includes <strong>{status?.maxTfns}</strong> Toll-Free Numbers. 
                        You need to select <strong>{remainingToSelect}</strong> more.
                    </p>
                </div>

                <Card className="shadow-xl border-0 overflow-hidden">
                    <CardHeader className="bg-white border-b border-slate-100">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>Available Numbers</CardTitle>
                                <CardDescription>Select up to {remainingToSelect} numbers</CardDescription>
                            </div>
                            <div className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-bold">
                                {selectedTfnIds.length} / {remainingToSelect} Selected
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        {availableTfns.length === 0 ? (
                            <div className="p-12 text-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                                <p className="text-slate-500 italic">No numbers available at the moment.</p>
                                <Button variant="link" onClick={() => navigate('/dashboard')} className="mt-4">Skip for now</Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto pr-2">
                                {availableTfns.map((tfn) => (
                                    <div
                                        key={tfn.id}
                                        onClick={() => toggleTfnSelection(tfn.id)}
                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                            selectedTfnIds.includes(tfn.id)
                                                ? 'border-primary-600 bg-primary-50 ring-4 ring-primary-500/10' 
                                                : 'border-slate-100 bg-slate-50 hover:border-primary-200 hover:bg-white'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="font-bold text-lg text-slate-900">{tfn.number}</div>
                                            {selectedTfnIds.includes(tfn.id) && <CheckCircle className="w-5 h-5 text-primary-600" />}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-wider">Toll-Free</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="mt-8 pt-6 border-t border-slate-100 flex gap-4">
                            <Button 
                                variant="ghost" 
                                onClick={() => navigate('/dashboard')}
                                className="text-slate-500"
                            >
                                Skip
                            </Button>
                            <Button
                                className="flex-1 bg-primary-600 hover:bg-primary-700 h-12 text-base font-bold shadow-lg shadow-primary-500/20"
                                onClick={handleSelect}
                                disabled={selectedTfnIds.length === 0 || processing}
                            >
                                {processing ? (
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                ) : (
                                    <>
                                        Confirm {selectedTfnIds.length > 0 ? `(${selectedTfnIds.length})` : ''} Selection
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default TfnOnboardingPage;
