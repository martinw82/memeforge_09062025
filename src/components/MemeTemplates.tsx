import React, { useEffect, useState } from 'react';
import { useMeme } from '../context/MemeContext';
import { useSubscription } from '../context/SubscriptionContext';
import { supabaseHelpers } from '../utils/supabase';
import { trackingAPI, impressionThrottle, createEventKey } from '../utils/api';
import { trackEvent, measurePerformance } from '../utils/analytics';
import { SponsoredTemplateWithSponsor } from '../types/supabase';
import { Search, RefreshCw, Upload, Crown, ExternalLink, Lock, Star } from 'lucide-react';
import PremiumFeatures from './PremiumFeatures';

interface Template {
  id: string;
  name: string;
  url: string;
  boxCount: number;
  isSponsored?: boolean;
  isPremium?: boolean;
  sponsor?: {
    id: string;
    name: string;
    logo_url?: string;
    website_url?: string;
  };
  priority?: number;
}

const MemeTemplates: React.FC = () => {
  const { memeState, setTemplates, selectTemplate } = useMeme();
  const { isPremium } = useSubscription();
  const { templates, selectedTemplate } = memeState;
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [sponsoredTemplates, setSponsoredTemplates] = useState<SponsoredTemplateWithSponsor[]>([]);
  const [showSponsoredOnly, setShowSponsoredOnly] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  useEffect(() => {
    fetchTemplates();
    fetchSponsoredTemplates();
  }, []);

  useEffect(() => {
    combineAndFilterTemplates();
  }, [searchTerm, templates, sponsoredTemplates, showSponsoredOnly, isPremium]);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      await measurePerformance('template_fetch', async () => {
        // Regular meme templates with some marked as premium
        const mockTemplates = [
          {
            id: '181913649',
            name: 'Drake Hotline Bling',
            url: 'https://images.pexels.com/photos/920220/pexels-photo-920220.jpeg',
            boxCount: 2,
          },
          {
            id: '87743020',
            name: 'Two Buttons',
            url: 'https://images.pexels.com/photos/2167395/pexels-photo-2167395.jpeg',
            boxCount: 3,
          },
          {
            id: '112126428',
            name: 'Distracted Boyfriend',
            url: 'https://images.pexels.com/photos/878979/pexels-photo-878979.jpeg',
            boxCount: 3,
            isPremium: true, // Premium template
          },
          {
            id: '131087935',
            name: 'Running Away Balloon',
            url: 'https://images.pexels.com/photos/1578750/pexels-photo-1578750.jpeg',
            boxCount: 5,
          },
          {
            id: '217743513',
            name: 'UNO Draw 25 Cards',
            url: 'https://images.pexels.com/photos/2923156/pexels-photo-2923156.jpeg',
            boxCount: 2,
            isPremium: true, // Premium template
          },
          {
            id: '93895088',
            name: 'Expanding Brain',
            url: 'https://images.pexels.com/photos/593333/pexels-photo-593333.jpeg',
            boxCount: 4,
          },
          {
            id: '124822590',
            name: 'Left Exit 12 Off Ramp',
            url: 'https://images.pexels.com/photos/814499/pexels-photo-814499.jpeg',
            boxCount: 3,
            isPremium: true, // Premium template
          },
          {
            id: '247375501',
            name: 'Buff Doge vs. Cheems',
            url: 'https://images.pexels.com/photos/3361739/pexels-photo-3361739.jpeg',
            boxCount: 4,
          },
          // Additional premium templates
          {
            id: 'premium_1',
            name: 'Elite Business Cat',
            url: 'https://images.pexels.com/photos/1741205/pexels-photo-1741205.jpeg',
            boxCount: 2,
            isPremium: true,
          },
          {
            id: 'premium_2',
            name: 'Professional Handshake',
            url: 'https://images.pexels.com/photos/955395/pexels-photo-955395.jpeg',
            boxCount: 3,
            isPremium: true,
          },
          {
            id: 'premium_3',
            name: 'Luxury Lifestyle',
            url: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg',
            boxCount: 2,
            isPremium: true,
          },
        ];
        
        setTemplates(mockTemplates);
      });
    } catch (error) {
      console.error('Error fetching meme templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSponsoredTemplates = async () => {
    try {
      const { data, error } = await supabaseHelpers.getSponsoredTemplates();
      
      if (error) {
        console.error('Error fetching sponsored templates:', error);
        return;
      }

      if (data) {
        setSponsoredTemplates(data);
      }
    } catch (error) {
      console.error('Error fetching sponsored templates:', error);
    }
  };

  const combineAndFilterTemplates = () => {
    let allTemplates: Template[] = [];

    // Add sponsored templates first (higher priority)
    const sponsoredTemplateMapped = sponsoredTemplates.map(sponsored => ({
      id: sponsored.id,
      name: sponsored.template_name,
      url: sponsored.template_url,
      boxCount: 2,
      isSponsored: true,
      sponsor: sponsored.sponsor,
      priority: sponsored.priority,
    }));

    if (showSponsoredOnly) {
      allTemplates = sponsoredTemplateMapped;
    } else {
      // Combine regular templates with sponsored ones
      allTemplates = [
        ...sponsoredTemplateMapped,
        ...templates.map(template => ({ 
          ...template, 
          isSponsored: false 
        }))
      ];

      // Sort by priority (sponsored first, then by priority value, then premium)
      allTemplates.sort((a, b) => {
        if (a.isSponsored && !b.isSponsored) return -1;
        if (!a.isSponsored && b.isSponsored) return 1;
        if (a.isSponsored && b.isSponsored) {
          return (b.priority || 0) - (a.priority || 0);
        }
        if (a.isPremium && !b.isPremium) return -1;
        if (!a.isPremium && b.isPremium) return 1;
        return 0;
      });
    }

    // Filter by search term
    if (searchTerm) {
      allTemplates = allTemplates.filter(template => 
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (template.sponsor?.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter sponsored content for premium users if they have ad-free
    if (isPremium && !showSponsoredOnly) {
      allTemplates = allTemplates.filter(template => !template.isSponsored);
    }

    setFilteredTemplates(allTemplates);
  };

  const handleTemplateSelect = async (template: Template) => {
    // Check if template is premium and user doesn't have premium
    if (template.isPremium && !isPremium) {
      setShowPremiumModal(true);
      
      await trackEvent('premium_template_blocked', {
        template_id: template.id,
        template_name: template.name,
      });
      return;
    }

    selectTemplate({
      id: template.id,
      name: template.name,
      url: template.url,
      boxCount: template.boxCount,
    });

    // Track template selection
    await trackEvent('template_selected', {
      template_id: template.id,
      template_name: template.name,
      is_sponsored: template.isSponsored,
      is_premium: template.isPremium,
      sponsor_id: template.sponsor?.id,
    });

    // Track sponsored template selection
    if (template.isSponsored && template.sponsor) {
      const eventKey = createEventKey(template.sponsor.id, 'template', template.id);
      
      if (impressionThrottle.shouldTrack(eventKey)) {
        await trackingAPI.trackTemplateSelection(template.id, template.sponsor.id);
      }
    }
  };

  const handleSponsorClick = async (template: Template, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (template.sponsor?.website_url) {
      // Track sponsor click
      await trackingAPI.trackSponsorClick(
        template.sponsor.id, 
        template.sponsor.website_url, 
        'template'
      );
      
      // Open sponsor website
      window.open(template.sponsor.website_url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    // Track custom template upload
    await trackEvent('custom_template_uploaded', {
      file_size: file.size,
      file_type: file.type,
    });

    const reader = new FileReader();
    reader.onload = (e) => {
      const newTemplate = {
        id: `custom-${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        url: e.target?.result as string,
        boxCount: 2,
      };

      setTemplates([newTemplate, ...templates]);
      selectTemplate(newTemplate);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    // Track custom template upload
    await trackEvent('custom_template_uploaded', {
      file_size: file.size,
      file_type: file.type,
    });

    const reader = new FileReader();
    reader.onload = (e) => {
      const newTemplate = {
        id: `custom-${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        url: e.target?.result as string,
        boxCount: 2,
      };

      setTemplates([newTemplate, ...templates]);
      selectTemplate(newTemplate);
    };
    reader.readAsDataURL(file);
  };

  const handleSearchChange = async (value: string) => {
    setSearchTerm(value);
    
    if (value.length > 0) {
      await trackEvent('template_searched', {
        search_term: value,
        results_count: filteredTemplates.length,
      });
    }
  };

  const handleSponsoredToggle = async () => {
    const newValue = !showSponsoredOnly;
    setShowSponsoredOnly(newValue);
    
    await trackEvent('sponsored_filter_toggled', {
      show_sponsored_only: newValue,
    });
  };

  // Count premium templates
  const premiumTemplateCount = filteredTemplates.filter(t => t.isPremium).length;

  return (
    <div 
      className="bg-gray-800 rounded-lg p-4 md:p-6 text-white relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:justify-between md:items-center mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-lg md:text-xl font-bold">Choose a Template</h2>
          {premiumTemplateCount > 0 && (
            <div className="flex items-center gap-1 text-xs bg-purple-900 bg-opacity-30 px-2 py-1 rounded">
              <Crown size={12} className="text-yellow-400" />
              <span>{premiumTemplateCount} Premium</span>
            </div>
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full md:w-auto">
          <div className="relative flex-grow sm:flex-grow-0 sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="bg-gray-700 text-white rounded-md py-2 pl-10 pr-4 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
            />
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleSponsoredToggle}
              className={`p-2 rounded-md transition-colors flex items-center justify-center ${
                showSponsoredOnly 
                  ? 'bg-yellow-600 hover:bg-yellow-700' 
                  : 'bg-gray-600 hover:bg-gray-500'
              }`}
              title={showSponsoredOnly ? 'Show all templates' : 'Show sponsored only'}
            >
              <Crown size={18} />
              <span className="ml-2 sm:hidden">
                {showSponsoredOnly ? 'All' : 'Sponsored'}
              </span>
            </button>
            <label className="bg-blue-600 hover:bg-blue-700 p-2 rounded-md transition-colors cursor-pointer flex items-center justify-center">
              <Upload size={18} />
              <span className="ml-2 sm:hidden">Upload</span>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileUpload}
              />
            </label>
            <button
              onClick={() => {
                fetchTemplates();
                fetchSponsoredTemplates();
              }}
              className="bg-blue-600 hover:bg-blue-700 p-2 rounded-md transition-colors flex items-center justify-center"
              disabled={isLoading}
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
              <span className="ml-2 sm:hidden">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Premium user notice */}
      {isPremium && (
        <div className="mb-4 p-3 bg-purple-900 bg-opacity-30 border border-purple-700 rounded-md">
          <div className="flex items-center gap-2 text-purple-400 text-sm">
            <Crown size={16} />
            <span>Premium Active: Enjoying ad-free templates and exclusive premium content!</span>
          </div>
        </div>
      )}

      {/* Sponsored content notice */}
      {sponsoredTemplates.length > 0 && !showSponsoredOnly && !isPremium && (
        <div className="mb-4 p-3 bg-blue-900 bg-opacity-30 border border-blue-700 rounded-md">
          <div className="flex items-center gap-2 text-blue-400 text-sm">
            <Crown size={16} />
            <span>Templates marked with a crown are sponsored content from our partners</span>
          </div>
        </div>
      )}

      {isDragging && (
        <div className="absolute inset-0 bg-blue-600 bg-opacity-20 border-2 border-blue-500 border-dashed rounded-lg flex items-center justify-center z-10">
          <div className="text-lg md:text-xl font-semibold text-blue-500">Drop image here</div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <RefreshCw size={32} className="animate-spin text-blue-500" />
        </div>
      ) : filteredTemplates.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className={`relative cursor-pointer overflow-hidden rounded-lg transition-all transform hover:scale-105 ${
                selectedTemplate?.id === template.id ? 'ring-2 md:ring-4 ring-blue-500' : ''
              } ${template.isSponsored ? 'ring-1 ring-yellow-400' : ''} ${
                template.isPremium ? 'ring-1 ring-purple-400' : ''
              }`}
              onClick={() => handleTemplateSelect(template)}
            >
              <img
                src={template.url}
                alt={template.name}
                className="w-full h-32 md:h-40 object-cover"
                loading="lazy"
              />
              
              {/* Premium Lock Overlay */}
              {template.isPremium && !isPremium && (
                <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center">
                  <div className="text-center">
                    <Lock size={24} className="text-purple-400 mx-auto mb-2" />
                    <div className="text-xs text-purple-400 font-semibold">Premium</div>
                  </div>
                </div>
              )}
              
              {/* Sponsored badge */}
              {template.isSponsored && (
                <div className="absolute top-2 left-2 bg-yellow-600 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                  <Crown size={12} />
                  Sponsored
                </div>
              )}

              {/* Premium badge */}
              {template.isPremium && (
                <div className="absolute top-2 right-2 bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                  <Star size={12} />
                  Premium
                </div>
              )}

              {/* Template name overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 p-2">
                <div className="text-xs md:text-sm truncate text-white font-medium">
                  {template.name}
                </div>
                
                {/* Sponsor info */}
                {template.isSponsored && template.sponsor && (
                  <div className="flex items-center justify-between mt-1">
                    <div className="text-xs text-gray-300 truncate">
                      by {template.sponsor.name}
                    </div>
                    {template.sponsor.website_url && (
                      <button
                        onClick={(e) => handleSponsorClick(template, e)}
                        className="text-yellow-400 hover:text-yellow-300 transition-colors p-1"
                        title={`Visit ${template.sponsor.name}`}
                      >
                        <ExternalLink size={12} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">
            {searchTerm 
              ? `No templates found matching "${searchTerm}"` 
              : showSponsoredOnly
              ? 'No sponsored templates available'
              : 'No templates available'
            }
          </p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors text-sm md:text-base"
            >
              Show all templates
            </button>
          )}
          {showSponsoredOnly && (
            <button
              onClick={() => setShowSponsoredOnly(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors text-sm md:text-base ml-2"
            >
              Show all templates
            </button>
          )}
        </div>
      )}

      {/* Sponsored content footer */}
      {sponsoredTemplates.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-700">
          <div className="text-xs text-gray-400 text-center">
            <p>💡 Sponsored templates help support MemeForge development</p>
            <p className="mt-1">
              Interested in sponsoring? Contact us at{' '}
              <a href="mailto:partnerships@memeforge.app" className="text-blue-400 hover:text-blue-300">
                partnerships@memeforge.app
              </a>
            </p>
          </div>
        </div>
      )}

      {/* Premium Features Modal */}
      {showPremiumModal && (
        <PremiumFeatures
          isModal={true}
          onClose={() => setShowPremiumModal(false)}
        />
      )}
    </div>
  );
};

export default MemeTemplates;