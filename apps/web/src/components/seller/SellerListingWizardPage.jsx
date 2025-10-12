import React from 'react';
import { useParams } from 'react-router-dom';
import SellerListingWizard from './SellerListingWizard.jsx';

const SellerListingWizardPage = ({ user }) => {
  const { listingId } = useParams();
  return <SellerListingWizard user={user} listingId={listingId ? Number(listingId) : null} />;
};

export default SellerListingWizardPage;
