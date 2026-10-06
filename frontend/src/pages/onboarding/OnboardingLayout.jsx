
import React from 'react';
import { Outlet } from 'react-router-dom';

const OnboardingLayout = () => {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Cloud PBX
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Premium Telecom Services
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md lg:max-w-2xl">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default OnboardingLayout;
