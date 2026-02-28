export default function AboutModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors z-10"
        >
          <svg
            className="w-5 h-5 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="p-6 md:p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-1">
              VinFast Dashboard
            </h2>
            <p className="text-sm font-bold text-gray-500 tracking-wider uppercase">
              Mã nguồn mở bởi{" "}
              <span className="text-blue-600">VF9 Club Việt Nam</span>
            </p>
          </div>

          {/* Mobile Content (Short, No Images) */}
          <div className="md:hidden space-y-4">
            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
              Dự án cộng đồng được phát triển để cung cấp cái nhìn sâu hơn
              về dữ liệu xe của bạn. Chúng tôi trực quan hóa dữ liệu telemetry
              thô từ máy chủ VinFast để hiển thị chi tiết thường không có trên
              ứng dụng chính thức.
            </p>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-4 space-y-2 border border-gray-100 dark:border-gray-600">
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">Mục tiêu chính</h3>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1 list-disc pl-4">
                <li>Hiển thị dữ liệu ẩn (SOH, phiên bản ECU)</li>
                <li>Giám sát trạng thái rõ ràng, trực quan</li>
                <li>Cộng đồng phát triển & Phi thương mại</li>
              </ul>
            </div>

            <div className="text-xs text-gray-400 text-center pt-4 border-t border-gray-100 italic">
              <div className="flex justify-center items-center gap-2 mb-2">
                <span>v1.0.0</span>
                <span>•</span>
                <a
                  href="https://github.com/VF9-Club/VFDashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline flex items-center gap-1"
                >
                  GitHub
                </a>
              </div>
              &quot;Công cụ của người đam mê, bởi người đam mê.&quot; <br />
              Không liên kết với VinFast Auto.
            </div>
          </div>

          {/* Desktop Content (Full, With Images) */}
          <div className="hidden md:block">
            <div className="grid grid-cols-2 gap-6 items-start">
              <div className="space-y-4">
                <div className="prose prose-blue prose-sm">
                  <p className="text-gray-600 dark:text-gray-300 leading-snug">
                    <strong>VinFast Dashboard</strong> là dự án mã nguồn mở
                    được khởi xướng bởi thành viên của <strong>VF9 Club Việt Nam</strong>.
                  </p>
                  <p className="text-gray-600 dark:text-gray-300 leading-snug">
                    Sứ mệnh của chúng tôi là xây dựng công cụ toàn diện giúp
                    người dùng trực quan hóa dữ liệu xe một cách trực quan hơn.
                    Bằng cách tận dụng dữ liệu telemetry thô, chúng tôi hiển thị
                    các thông tin giá trị như
                    <span className="text-blue-600 font-medium">
                      {" "}
                      SOH Pin
                    </span>{" "}
                    và{" "}
                    <span className="text-blue-600 font-medium">
                      Phiên bản ECU
                    </span>
                    — thường không hiển thị trên ứng dụng chính thức.
                  </p>
                  <p className="text-gray-600 dark:text-gray-300 leading-snug">
                    Đây hoàn toàn là{" "}
                    <strong>sáng kiến phi thương mại</strong> được
                    tạo ra thuần túy từ đam mê công nghệ và cộng đồng VinFast.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <h4 className="font-bold text-blue-800 mb-1 text-sm">
                      Thông tin sâu hơn
                    </h4>
                    <p className="text-xs text-blue-600">
                      Xem chi tiết bên trong xe với trực quan hóa dữ liệu thô.
                    </p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                    <h4 className="font-bold text-green-800 mb-1 text-sm">
                      Dữ liệu thời gian thực
                    </h4>
                    <p className="text-xs text-green-600">
                      Cập nhật trực tiếp pin, sạc và trạng thái khí hậu.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center space-y-3">
                <div className="rounded-xl overflow-hidden shadow-md border border-gray-100 relative group max-w-[220px]">
                  <img
                    src="/mobile-vf9-energy.webp"
                    alt="Dashboard Preview"
                    className="w-full h-auto transform group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
                    <span className="text-white font-bold text-xs">
                      Trực quan hóa dữ liệu ẩn
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 text-center">
              <div className="flex justify-center gap-4 text-xs text-gray-400 mb-2">
                <span>v1.0.0 (Stable)</span>
                <span>•</span>
                <a
                  href="https://github.com/VF9-Club/VFDashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 flex items-center gap-1 font-medium transition-colors"
                >
                  Xem mã nguồn trên GitHub
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              </div>
              <p className="text-sm text-gray-500 font-medium">
                Được tạo với ❤️ tại Việt Nam
              </p>
              <p className="text-xs text-gray-400 mt-1 max-w-xl mx-auto leading-normal">
                Tuyên bố miễn trừ: Phần mềm này không liên kết, không được tài trợ
                hoặc kết nối với VinFast Auto hay các công ty con. Phần mềm được cung cấp
                &quot;nguyên trạng&quot; chỉ cho mục đích giáo dục và sử dụng cá nhân.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
