'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

interface AlertActionHandlerProps {
  campaigns: { id: number; name: string }[];
  adGroups: { id: number; name: string; campaign_id: number }[];
}

export default function AlertActionHandler({ campaigns, adGroups }: AlertActionHandlerProps) {
  const searchParams = useSearchParams();
  const highlight = searchParams.get('highlight');
  const campaignId = searchParams.get('campaign_id');
  const edit = searchParams.get('edit');

  useEffect(() => {
    // URLパラメータが変わるたびに実行される

    // パラメータがない場合は sessionStorage をクリアして終了
    if (!highlight && !edit) {
      sessionStorage.removeItem('editCampaignId');
      sessionStorage.removeItem('editAdGroupId');
      return;
    }

    // 異なるハイライトタイプの場合、既存のsessionStorageをクリア
    if (highlight === 'create-ad') {
      sessionStorage.removeItem('editCampaignId');
      sessionStorage.removeItem('editAdGroupId');
    } else if (highlight === 'adgroups') {
      sessionStorage.removeItem('editCampaignId');
    } else if (highlight === 'campaigns') {
      sessionStorage.removeItem('editAdGroupId');
    }

    // DOM要素の存在を確認してから実行
      // 1. NO_ADS_IN_CAMPAIGN: Scroll to create-ad section
      if (highlight === 'create-ad' && campaignId) {
        const createAdSection = document.getElementById('create-ad-section');
        
        if (createAdSection) {
          const rect = createAdSection.getBoundingClientRect();
          const scrollTop = window.scrollY + rect.top + 100; // 100px余裕を持たせて下にスクロール
          window.scrollTo({ top: scrollTop, behavior: 'smooth' });
          createAdSection.classList.add('ring-2', 'ring-blue-400', 'ring-offset-4');
          setTimeout(() => createAdSection.classList.remove('ring-2', 'ring-blue-400', 'ring-offset-4'), 3000);
        }
      }

      // 2. PARENT_PAUSED: Scroll to adgroups table and trigger edit modal
      if (highlight === 'adgroups' && edit?.startsWith('adgroup-')) {
        const adGroupId = parseInt(edit.replace('adgroup-', ''));
        const adGroupsSection = document.getElementById('adgroups-section');
        
        if (adGroupsSection) {
          const rect = adGroupsSection.getBoundingClientRect();
          const scrollTop = window.scrollY + rect.top + 100; // 100px余裕を持たせて下にスクロール
          window.scrollTo({ top: scrollTop, behavior: 'smooth' });
          adGroupsSection.classList.add('ring-2', 'ring-blue-400', 'ring-offset-4');
          setTimeout(() => adGroupsSection.classList.remove('ring-2', 'ring-blue-400', 'ring-offset-4'), 3000);
        }

        // Store the adGroup to edit in sessionStorage for the table component to pick up
        sessionStorage.setItem('editAdGroupId', adGroupId.toString());
      }

      // 3. NO_BUDGET / BUDGET_EXHAUSTED: Scroll to campaigns table and trigger edit modal
      if (highlight === 'campaigns' && edit?.startsWith('campaign-')) {
        const editCampaignId = parseInt(edit.replace('campaign-', ''));
        const campaignsSection = document.getElementById('campaigns-section');
        
        if (campaignsSection) {
          const rect = campaignsSection.getBoundingClientRect();
          const scrollTop = window.scrollY + rect.top + 100; // 100px余裕を持たせて下にスクロール
          window.scrollTo({ top: scrollTop, behavior: 'smooth' });
          campaignsSection.classList.add('ring-2', 'ring-blue-400', 'ring-offset-4');
          setTimeout(() => campaignsSection.classList.remove('ring-2', 'ring-blue-400', 'ring-offset-4'), 3000);
        }

        // Store the campaign to edit in sessionStorage for the table component to pick up
        sessionStorage.setItem('editCampaignId', editCampaignId.toString());
      }
  }, [highlight, edit, campaignId]); // URLパラメータが変わるたびに再実行

  return null;
}
