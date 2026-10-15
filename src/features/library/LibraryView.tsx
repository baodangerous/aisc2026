import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  Search,
  Video,
  Play,
  ShieldCheck,
  Clock,
  Filter,
  Activity,
  AlertCircle,
} from 'lucide-react';
import {
  searchApprovedResources,
  getLearningResourceBySlugOrId,
} from '../../content/curatedLearningCatalog';
import { MEDICAL_DISCLAIMER_VI } from '../../content/approvedScenarios';
import { MedicalLearningResource } from '../../domain/schemas';
import { CPRMetronome } from '../../components/CPRMetronome';
import { Call115Modal } from '../../components/Call115Modal';
import { LessonDetailModal } from './LessonDetailModal';
import { SafeImage } from '../../components/common/SafeImage';
import { MetadataRow } from '../../components/common/MetadataSeparators';
import { formatDuration } from '../../utils/formatters';

export const LibraryView: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialLessonSlug = searchParams.get('lesson');

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [isCall115Open, setIsCall115Open] = useState<boolean>(false);
  const [activeLesson, setActiveLesson] = useState<MedicalLearningResource | null>(() => {
    if (initialLessonSlug) {
      return getLearningResourceBySlugOrId(initialLessonSlug) || null;
    }
    return null;
  });

  const topicFilters = [
    { id: 'all', label: 'Tất cả chủ đề' },
    { id: 'scene_safety', label: '1. An toàn hiện trường' },
    { id: 'emergency_call', label: '2. Gọi hỗ trợ 115' },
    { id: 'cardiac_arrest', label: '3. Ngừng tuần hoàn & CPR' },
    { id: 'aed_usage', label: '4. Sử dụng máy AED' },
    { id: 'choking', label: '5. Hóc dị vật (Heimlich)' },
    { id: 'bleeding', label: '6. Chảy máu nghiêm trọng' },
    { id: 'burns', label: '7. Sơ cứu bỏng' },
    { id: 'seizure', label: '8. Sơ cứu co giật' },
    { id: 'stroke', label: '9. Dấu hiệu đột quỵ' },
    { id: 'traffic_accident', label: '10. Tai nạn giao thông' },
  ];

  const filteredResources = useMemo(() => {
    let list = searchApprovedResources(searchTerm, selectedTopic);
    if (selectedDifficulty !== 'all') {
      list = list.filter((r) => r.difficultyLevel === selectedDifficulty);
    }
    return list;
  }, [searchTerm, selectedTopic, selectedDifficulty]);

  const handleOpenLesson = (resource: MedicalLearningResource) => {
    setActiveLesson(resource);
    setSearchParams({ lesson: resource.slug });
  };

  const handleCloseLesson = () => {
    setActiveLesson(null);
    setSearchParams({});
  };

  return (
    <div className="min-h-[calc(100vh-var(--header-height))] bg-[#F9FAFB] text-slate-800 pb-24 md:pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        
        {/* Top Header Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Thư Viện Sơ Cấp Cứu Trực Quan &amp; Video Chuyên Môn</span>
            </div>
            <div className="text-xs text-slate-500 font-medium flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" aria-hidden="true" />
              <span>Nguồn chính thức (Bộ Y Tế / Hội Chữ Thập Đỏ / IFRC / AHA)</span>
            </div>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
              Kho Học Liệu Trực Quan &amp; Kỹ Năng Cứu Sinh
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-1">
              Tài liệu tham khảo từ nguồn công khai chuẩn hóa theo khuyến cáo hồi sinh tim phổi quốc tế và phác đồ sơ cấp cứu Bộ Y Tế.
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" aria-hidden="true" />
            </div>
            <input
              type="text"
              placeholder="Tìm kiếm: ép tim CPR, thủ thuật Heimlich, bỏng nước sôi, băng ép cầm máu, dấu hiệu FAST..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
            />
          </div>

          {/* Clean Segmented Filters */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <Filter className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Lọc theo 10 chủ đề thiết yếu:</span>
            </div>

            <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100/70 rounded-xl">
              {topicFilters.map((topic) => (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => setSelectedTopic(topic.id)}
                  className={`py-1.5 px-3 rounded-lg text-xs transition-all cursor-pointer whitespace-nowrap ${
                    selectedTopic === topic.id
                      ? 'bg-white text-slate-900 font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 font-medium'
                  }`}
                >
                  {topic.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-1 text-xs">
              <span className="font-semibold text-slate-500">Mức độ:</span>
              <div className="inline-flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg">
                {['all', 'Cơ bản', 'Nâng cao'].map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setSelectedDifficulty(diff)}
                    className={`px-3 py-1 rounded-md text-xs transition-all cursor-pointer ${
                      selectedDifficulty === diff
                        ? 'bg-white text-slate-900 font-bold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {diff === 'all' ? 'Tất cả' : diff}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Visual Cards Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-700">
              Hiển thị <strong className="font-mono">{filteredResources.length}</strong> bài học được kiểm duyệt
            </span>
          </div>

          {filteredResources.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" aria-hidden="true" />
              <h3 className="text-sm font-bold text-slate-900">
                Không tìm thấy bài học phù hợp
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Vui lòng thử tìm kiếm với từ khóa khác hoặc chuyển sang chủ đề khác.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredResources.map((res) => {
                const durationStr = formatDuration(res.durationSeconds);

                return (
                  <div
                    key={res.id}
                    className="bg-white border border-slate-200 hover:border-blue-500 rounded-2xl overflow-hidden shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Video Thumbnail with Safe Fallback */}
                      <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
                        <SafeImage
                          src={res.thumbnailUrl}
                          alt={res.title}
                          fallbackCategory="general"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

                        {/* Quiet unboxed duration indicator */}
                        <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 text-white text-xs font-mono font-medium drop-shadow-sm">
                          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{durationStr}</span>
                        </div>

                        {/* Play Icon Trigger */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg">
                            <Play className="w-5 h-5 fill-current ml-0.5" aria-hidden="true" />
                          </div>
                        </div>
                      </div>

                      {/* Content Body */}
                      <div className="p-4 space-y-2">
                        <MetadataRow
                          items={[
                            res.sourceOrganization,
                            res.difficultyLevel,
                            res.language.toUpperCase(),
                          ]}
                          className="text-xs text-slate-500"
                        />

                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug line-clamp-2">
                          {res.title}
                        </h3>

                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {res.description}
                        </p>

                        <div className="pt-1 flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
                          <span className="truncate">{res.evidenceLevel}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer Action (min 44px touch target) */}
                    <div className="p-4 pt-0">
                      <button
                        type="button"
                        onClick={() => handleOpenLesson(res)}
                        className="w-full min-h-[44px] py-2 px-3 bg-slate-100 group-hover:bg-blue-600 text-slate-700 group-hover:text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-blue-600"
                        aria-label={`Xem hướng dẫn chi tiết ${res.title}`}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                        <span>Xem Hướng Dẫn Chi Tiết</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CPR Metronome Section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 text-blue-600">
            <Activity className="w-5 h-5 shrink-0" aria-hidden="true" />
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              Bộ Đếm Nhịp CPR Hồi Sinh Tim Phổi Chuẩn 110 Nhịp/Phút
            </h2>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Sử dụng bộ gõ nhịp âm thanh để rèn luyện thói quen ép tim đều đặn theo tần số 100 - 120 bpm (khuyến cáo AHA 2020).
          </p>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <CPRMetronome bpm={110} />
          </div>
        </div>

        {/* Global Medical Disclaimer */}
        <div className="p-4 bg-slate-100 border border-slate-200 rounded-xl text-center space-y-1 text-xs text-slate-500 leading-relaxed">
          <p className="font-semibold text-slate-700">LƯU Ý QUAN TRỌNG VỀ ĐÀO TẠO &amp; CẤP CỨU</p>
          <p>{MEDICAL_DISCLAIMER_VI}</p>
        </div>
      </div>

      {/* Lesson Detail Modal */}
      <LessonDetailModal
        resource={activeLesson}
        onClose={handleCloseLesson}
        onOpenCall115={() => setIsCall115Open(true)}
      />

      {/* 115 Modal */}
      <Call115Modal
        isOpen={isCall115Open}
        onClose={() => setIsCall115Open(false)}
        incidentTypeHint="Liên hệ khẩn cấp tổng đài 115"
      />
    </div>
  );
};
