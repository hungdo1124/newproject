const express = require('express');
const fs = require('fs'); 
const fsPromises = require('fs').promises;
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const POSTS_FILE = path.join(DATA_DIR, 'posts.json');

// --- DỮ LIỆU 18 BÀI VIẾT MẪU (GIỮ NGUYÊN ĐẦY ĐỦ) ---
const SAMPLE_POSTS = [
  // SỐNG XANH
  { id: 1, title: "Chàng trai 9x bỏ phố về quê: 'Hạnh phúc là được sống chậm lại giữa thiên nhiên'", summary: "Rời xa khói bụi thành phố, Minh tìm thấy niềm vui trong khu vườn nhỏ và những bữa cơm gia đình đầm ấm.", category: "Sống Xanh", image: "https://images.unsplash.com/photo-1592595896551-12b371d546d5?auto=format&fit=crop&w=800&q=80", author: "Thu Hà", date: "24/11/2024", views: 2450, content: "Sau 5 năm làm việc tại một tập đoàn công nghệ lớn ở Sài Gòn với mức lương nghìn đô, Nguyễn Văn Minh (29 tuổi) cảm thấy kiệt sức với guồng quay công việc 12 tiếng mỗi ngày. Quyết định bỏ phố về quê ở Lâm Đồng của anh ban đầu vấp phải sự phản đối kịch liệt từ gia đình.\n\nTuy nhiên, sau 2 năm, khu vườn 3000m2 của Minh đã phủ xanh bởi các loại rau hữu cơ và cây ăn trái. 'Nhiều người nói tôi điên khi từ bỏ sự nghiệp đang lên, nhưng mỗi sáng thức dậy nghe tiếng chim hót, hít thở không khí trong lành và tự tay hái rau nấu cơm, tôi biết mình đã chọn đúng', Minh chia sẻ. Giờ đây, anh không chỉ tự cung tự cấp thực phẩm sạch cho gia đình mà còn phát triển mô hình du lịch canh nông, đón tiếp những vị khách muốn tìm lại sự bình yên." },
  { id: 11, title: "Lối sống tối giản: Khi bớt đi vật chất là thêm vào hạnh phúc", summary: "Phong cách sống Danshari của người Nhật đang lan tỏa mạnh mẽ trong giới trẻ Việt, giúp giải phóng không gian và tâm trí.", category: "Sống Xanh", image: "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=800&q=80", author: "Yên Nhiên", date: "20/11/2024", views: 1800, content: "Tối giản (Minimalism) không chỉ là vứt bớt đồ đạc, mà là một tư duy sống. Bằng cách loại bỏ những vật dụng không cần thiết, chúng ta không chỉ có thêm không gian sống thoáng đãng mà còn tiết kiệm được thời gian dọn dẹp và tiền bạc mua sắm vô tội vạ.\n\nChị Lan Anh (Hà Nội) chia sẻ: 'Từ khi áp dụng lối sống tối giản, tôi thấy tâm trí mình nhẹ nhàng hơn hẳn. Thay vì đau đầu chọn quần áo mỗi sáng với tủ đồ chật ních, giờ tôi chỉ giữ lại những món thực sự chất lượng và phù hợp. Số tiền tiết kiệm được tôi dùng để đi du lịch và học thêm kỹ năng mới.' Lối sống này cũng góp phần bảo vệ môi trường bằng cách giảm thiểu rác thải và tiêu dùng bền vững." },
  { id: 12, title: "Biến rác thải nhựa thành gạch xây nhà: Sáng kiến xanh của sinh viên Việt", summary: "Nhóm bạn trẻ đã sáng chế thành công loại gạch sinh thái bền vững từ rác thải nhựa, mở ra hướng đi mới cho vật liệu xây dựng.", category: "Sống Xanh", image: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=800&q=80", author: "Môi Trường", date: "19/11/2024", views: 1650, content: "Vấn nạn rác thải nhựa đang là nỗi đau đầu của toàn cầu. Nhận thấy điều đó, nhóm sinh viên Đại học Bách Khoa đã dành 6 tháng nghiên cứu để tạo ra loại gạch 'Ecobrick'. Quy trình sản xuất bao gồm việc thu gom rác nhựa, làm sạch, cắt nhỏ và trộn với phụ gia xi măng đặc biệt.\n\nKết quả thử nghiệm cho thấy gạch Ecobrick có độ bền chịu lực tương đương gạch nung truyền thống nhưng nhẹ hơn 30% và giá thành rẻ hơn 20%. 'Chúng em hy vọng sản phẩm này sẽ được ứng dụng rộng rãi trong các công trình nhà ở xã hội, vừa giải quyết bài toán rác thải, vừa mang lại mái ấm giá rẻ cho người thu nhập thấp', trưởng nhóm nghiên cứu cho biết. Dự án đang được các quỹ đầu tư xanh quan tâm rót vốn để sản xuất đại trà." },
  // DU LỊCH
  { id: 2, title: "Top 10 địa điểm 'chữa lành' tâm hồn tuyệt đẹp tại Việt Nam dịp cuối năm", summary: "Từ những đồi chè xanh mướt ở Mộc Châu đến bãi biển hoang sơ Phú Yên, đây là những nơi giúp bạn nạp lại năng lượng sau một năm làm việc vất vả.", category: "Du Lịch", image: "https://images.unsplash.com/photo-1504214208698-ea1916a2195a?auto=format&fit=crop&w=800&q=80", author: "Việt Travel", date: "23/11/2024", views: 1890, content: "Cuối năm là thời điểm lý tưởng để 'trốn' khỏi deadline và tìm về với thiên nhiên. Đứng đầu danh sách năm nay là Mộc Châu (Sơn La) với mùa hoa cải trắng nở rộ khắp các sườn đồi, tạo nên khung cảnh như chốn thần tiên. Không khí se lạnh và những tách trà nóng hổi sẽ xua tan mọi mệt mỏi.\n\nNếu yêu biển, Phú Yên với Gành Đá Đĩa và Bãi Xép là lựa chọn không thể bỏ qua. Vẻ đẹp hoang sơ, chưa bị du lịch hóa quá mức ở đây giúp bạn thực sự được hòa mình vào tiếng sóng biển rì rào. Ngoài ra, danh sách còn có Pù Luông (Thanh Hóa), Tà Xùa (Sơn La) và Côn Đảo (Vũng Tàu) - những điểm đến hứa hẹn mang lại sự bình yên tuyệt đối cho tâm hồn." },
  { id: 7, title: "Chinh phục đỉnh Fansipan: Hành trình của ý chí và tuổi trẻ", summary: "Nhóm bạn trẻ đã cùng nhau vượt qua giới hạn bản thân để chạm tay vào 'Nóc nhà Đông Dương' bằng đường bộ đầy thử thách.", category: "Du Lịch", image: "https://images.unsplash.com/photo-1526716173434-a1b560f2065d?auto=format&fit=crop&w=800&q=80", author: "Phượt Bụi", date: "22/11/2024", views: 1100, content: "Thay vì đi cáp treo chỉ mất 15 phút, nhóm của Tuấn Anh chọn cung đường trekking Trạm Tôn kéo dài 2 ngày 1 đêm. 'Đó là một thử thách thực sự về thể lực và ý chí. Có những đoạn dốc đứng, gió rít từng cơn lạnh buốt khiến cả nhóm muốn bỏ cuộc', Tuấn Anh kể lại.\n\nNhưng phần thưởng cho sự nỗ lực là vô giá. Cảm giác đứng trên đỉnh núi cao 3.143m, nhìn biển mây cuồn cuộn dưới chân và đón ánh bình minh đầu tiên là trải nghiệm không thể nào quên. Đêm cắm trại giữa rừng già Hoàng Liên Sơn, bên bếp lửa hồng và những câu chuyện không đầu không cuối cũng là kỷ niệm gắn kết tình bạn tuyệt vời. Chuyến đi không chỉ là chinh phục một ngọn núi, mà là chiến thắng chính bản thân mình." },
  { id: 15, title: "Vẻ đẹp hút hồn của mùa lúa chín Mù Cang Chải nhìn từ trên cao", summary: "Những thửa ruộng bậc thang vàng óng ả trải dài như những nấc thang lên thiên đường làm say lòng du khách.", category: "Du Lịch", image: "https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=800&q=80", author: "Nhiếp Ảnh Gia", date: "15/11/2024", views: 4100, content: "Tháng 9, tháng 10 hàng năm, Mù Cang Chải (Yên Bái) lại khoác lên mình chiếc áo vàng rực rỡ của mùa lúa chín. Nhìn từ flycam, những thửa ruộng bậc thang ở đồi Mâm Xôi, đồi Móng Ngựa uốn lượn mềm mại như những vân tay của đất trời.\n\nĐây không chỉ là kiệt tác của thiên nhiên mà còn là kết tinh mồ hôi công sức bao đời của đồng bào người Mông. Du khách đến đây không chỉ để 'săn' ảnh đẹp mà còn để trải nghiệm lễ hội mừng cơm mới, thưởng thức cốm Tú Lệ dẻo thơm và hòa mình vào không gian văn hóa vùng cao đặc sắc. Mù Cang Chải đã được trang web du lịch nổi tiếng Big 7 Travel bình chọn là một trong những điểm đến đẹp nhất thế giới." },
  // --- ẨM THỰC ---
  { id: 3, title: "Bánh mì Việt Nam tiếp tục lọt Top món ăn đường phố ngon nhất thế giới", summary: "Hương vị giòn tan, nhân đậm đà của bánh mì một lần nữa chinh phục các chuyên gia ẩm thực quốc tế.", category: "Ẩm Thực", image: "https://images.unsplash.com/photo-1541518763669-27fef04b14ea?auto=format&fit=crop&w=800&q=80", author: "Bếp Nhà", date: "22/11/2024", views: 5200, content: "Tạp chí TasteAtlas vừa công bố danh sách 100 món ăn đường phố ngon nhất thế giới 2024, và không ngạc nhiên khi Bánh Mì Việt Nam chễm chệ trong Top 5. Sự kết hợp hoàn hảo giữa vỏ bánh giòn rụm, ruột bánh mềm xốp cùng sự hòa quyện của pate béo ngậy, thịt nướng thơm lừng, đồ chua giòn tan và rau thơm tươi mát đã tạo nên một bản giao hưởng vị giác khó quên.\n\n'Bánh mì Việt Nam là ví dụ điển hình cho sự giao thoa văn hóa ẩm thực tuyệt vời. Nó giữ được nét tinh tế của ẩm thực Pháp nhưng lại mang đậm hồn cốt và hương vị nhiệt đới của Việt Nam', một chuyên gia ẩm thực nhận định. Dù là bánh mì Phượng Hội An, bánh mì Huỳnh Hoa Sài Gòn hay một xe bánh mì vô danh góc phố, tất cả đều có sức hút kỳ lạ với du khách quốc tế." },
  { id: 6, title: "Bí quyết nấu Phở bò gia truyền chuẩn vị Hà Nội xưa", summary: "Nước dùng trong vắt, ngọt thanh từ xương hầm 12 tiếng và mùi hương hồi quế nồng nàn là linh hồn của bát phở.", category: "Ẩm Thực", image: "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=800&q=80", author: "Đầu Bếp", date: "21/11/2024", views: 3400, content: "Để nấu được một nồi nước dùng phở bò chuẩn vị không phải chuyện đơn giản. Nghệ nhân ẩm thực Ánh Tuyết chia sẻ: 'Xương bò phải được ngâm và rửa thật kỹ, sau đó nướng gừng và hành tím cho thơm lừng rồi mới bỏ vào nồi hầm. Quan trọng nhất là phải hầm lửa nhỏ liu riu trong suốt 10-12 tiếng và liên tục vớt bọt để nước dùng được trong'.\n\nGia vị của phở gồm thảo quả, hoa hồi, quế chi, đinh hương... được rang thơm và cho vào túi vải thả vào nồi nước ở giai đoạn cuối. Bánh phở phải là loại bánh tươi, mềm nhưng không nát. Thịt bò thái mỏng, trần tái vừa tới để giữ độ ngọt. Một bát phở ngon là sự tổng hòa của hương, sắc, vị, khiến thực khách ăn một lần là nhớ mãi hương vị Hà Thành xưa." },
  { id: 18, title: "Khám phá ẩm thực miền Tây sông nước: Dân dã mà đậm đà", summary: "Lẩu mắm, cá lóc nướng trui, bánh xèo miền Tây là những món ngon không thể bỏ qua khi xuôi về phương Nam.", category: "Ẩm Thực", image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=800&q=80", author: "Food Tour", date: "10/11/2024", views: 2900, content: "Về miền Tây mà chưa ăn lẩu mắm thì coi như chưa đến. Món ăn 'nặng mùi' này lại có sức gây nghiện kỳ lạ bởi vị đậm đà của mắm cá linh, cá sặc hòa quyện với vị ngọt của tôm, mực, thịt ba chỉ và hàng chục loại rau đồng nội như bông súng, điên điển, rau đắng...\n\nCá lóc nướng trui cũng là một trải nghiệm thú vị. Cá vừa bắt dưới mương lên, không cần đánh vảy, xiên que tre rồi cắm xuống đất, phủ rơm khô lên đốt. Khi rơm tàn cũng là lúc cá chín, cạo lớp vảy cháy đi, thịt cá trắng ngần, thơm phức mùi khói rơm, cuốn với bánh tráng và rau sống chấm mắm me thì 'ngon nuốt lưỡi'. Ẩm thực miền Tây hào sảng và phóng khoáng y như tính cách con người nơi đây vậy." },
  // --- SỨC KHỎE ---
  { id: 4, title: "5 thói quen nhỏ mỗi sáng giúp bạn tràn đầy năng lượng cả ngày", summary: "Chỉ cần 10 phút tập yoga hoặc một ly nước ấm, cơ thể bạn sẽ cảm thấy biết ơn vô cùng. Hãy bắt đầu ngày mới đúng cách.", category: "Sức Khỏe", image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80", author: "Bác sĩ Chi", date: "21/11/2024", views: 1200, content: "Đừng vội cầm điện thoại check Facebook ngay khi mở mắt. Thay vào đó, hãy uống ngay một cốc nước ấm (có thể thêm chút chanh và mật ong) để đánh thức hệ tiêu hóa và bù nước sau một đêm dài. Tiếp theo, hãy dành 5-10 phút để vận động nhẹ nhàng hoặc thiền định, giúp máu huyết lưu thông và tâm trí tỉnh táo.\n\nViệc tiếp xúc với ánh nắng mặt trời buổi sớm cũng rất quan trọng để kích hoạt hormone serotonin giúp cải thiện tâm trạng. Cuối cùng, đừng bao giờ bỏ bữa sáng. Một bữa sáng giàu protein và chất xơ sẽ cung cấp năng lượng bền bỉ cho não bộ hoạt động hiệu quả suốt buổi sáng. Những thay đổi nhỏ này nếu duy trì đều đặn sẽ tạo ra sự khác biệt lớn cho sức khỏe của bạn." },
  { id: 14, title: "Thiền định mỗi ngày: 15 phút để tìm lại sự cân bằng giữa cuộc sống bận rộn", summary: "Không cần phải lên núi cao, bạn có thể tìm thấy sự bình yên ngay trong căn phòng nhỏ của mình thông qua thiền định.", category: "Sức Khỏe", image: "https://images.unsplash.com/photo-1593811167562-9cef47bfc4d7?auto=format&fit=crop&w=800&q=80", author: "Mindfulness", date: "16/11/2024", views: 1300, content: "Trong thế giới hiện đại đầy rẫy áp lực và thông tin nhiễu loạn, bộ não của chúng ta luôn trong trạng thái căng thẳng (Overthinking). Thiền định (Meditation) chính là liều thuốc giải độc cho tâm trí. Khoa học đã chứng minh thiền giúp giảm nồng độ Cortisol (hormone gây stress), cải thiện giấc ngủ và tăng cường khả năng tập trung.\n\nBạn không cần phải ngồi kiết già hay tụng kinh phức tạp. Chỉ cần chọn một chỗ yên tĩnh, ngồi thẳng lưng, nhắm mắt lại và tập trung quan sát hơi thở của mình. Khi suy nghĩ ập đến, hãy nhẹ nhàng ghi nhận và để nó trôi qua, rồi quay lại với hơi thở. Chỉ cần 15 phút mỗi ngày, bạn sẽ thấy tâm trí mình sáng suốt hơn, cảm xúc cân bằng hơn và khả năng chịu đựng áp lực tốt hơn rất nhiều." },
  { id: 13, title: "Chế độ ăn Eat Clean: Hiểu đúng để khỏe đẹp bền vững", summary: "Không phải là ăn kiêng kham khổ, Eat Clean là lối sống lành mạnh ưu tiên thực phẩm nguyên bản và hạn chế chế biến.", category: "Sức Khỏe", image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=800&q=80", author: "Dinh Dưỡng", date: "18/11/2024", views: 2100, content: "Nhiều người lầm tưởng Eat Clean là chỉ ăn rau luộc và ức gà nhạt nhẽo. Thực tế, Eat Clean (Ăn sạch) là ưu tiên sử dụng thực phẩm ở dạng nguyên thủy nhất của nó (Whole foods), hạn chế tối đa đường, muối, dầu mỡ và các chất phụ gia bảo quản.\n\nBạn vẫn có thể ăn tinh bột, nhưng hãy chọn gạo lứt, yến mạch thay vì gạo trắng, bánh ngọt. Ưu tiên protein nạc, chất béo tốt từ quả bơ, các loại hạt. Nguyên tắc quan trọng là 'ăn đủ chất, không ăn ít'. Chế độ ăn này không chỉ giúp kiểm soát cân nặng hiệu quả mà còn giúp da dẻ mịn màng, giảm nguy cơ mắc các bệnh tim mạch, tiểu đường. Hãy bắt đầu bằng việc tự nấu ăn tại nhà và đọc kỹ nhãn thành phần khi mua đồ siêu thị." },
  // --- CÔNG NGHỆ ---
  { id: 5, title: "Công nghệ AI mới giúp người khiếm thị 'nhìn' thấy thế giới qua âm thanh", summary: "Một ứng dụng di động mới đang mở ra hy vọng và sự tự lập cho cộng đồng người khiếm thị bằng trí tuệ nhân tạo.", category: "Công Nghệ", image: "https://images.unsplash.com/photo-1555436169-20e93ea9a7ff?auto=format&fit=crop&w=800&q=80", author: "Tech Good", date: "19/11/2024", views: 1500, content: "Ứng dụng mang tên 'VisionAI' sử dụng camera điện thoại để quét môi trường xung quanh và mô tả lại bằng giọng nói thời gian thực cho người dùng. Nó có thể đọc biển báo giao thông, nhận diện mệnh giá tiền, đọc thực đơn tại nhà hàng và thậm chí mô tả cảm xúc trên khuôn mặt người đối diện.\n\n'Trước đây tôi luôn phải phụ thuộc vào người thân khi ra đường. Giờ đây với chiếc điện thoại, tôi tự tin hơn hẳn', anh Hùng, một người khiếm thị tại TP.HCM chia sẻ. Công nghệ AI không chỉ dừng lại ở Chatbot hay vẽ tranh, mà đang thực sự đi vào đời sống để giải quyết những vấn đề nhân văn, xóa nhòa khoảng cách và mang lại cơ hội bình đẳng cho người khuyết tật." },
  { id: 8, title: "Nông nghiệp công nghệ cao: Khi nông dân điều khiển ruộng đồng bằng smartphone", summary: "Những cánh đồng không dấu chân người, được tưới tiêu tự động và giám sát bằng drone, mang lại năng suất gấp đôi.", category: "Công Nghệ", image: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=800&q=80", author: "Minh Nông", date: "16/11/2024", views: 1450, content: "Tại Hậu Giang, mô hình trồng lúa thông minh đang được nhân rộng. Nông dân không cần lội bùn phun thuốc sâu mà sử dụng máy bay không người lái (Drone) để thực hiện việc đó nhanh gấp 50 lần sức người. Hệ thống cảm biến cắm dưới đất sẽ đo độ ẩm, độ pH và tự động kích hoạt hệ thống tưới tiêu khi cần thiết.\n\nToàn bộ thông số được gửi về ứng dụng trên điện thoại của người nông dân. Nhờ đó, chi phí phân bón, thuốc trừ sâu giảm 30%, trong khi năng suất lúa tăng 20%. Quan trọng hơn, sức khỏe người nông dân được bảo vệ do không phải tiếp xúc trực tiếp với hóa chất. Cuộc cách mạng 4.0 đang thay đổi bộ mặt nông thôn Việt Nam từng ngày." },
  { id: 16, title: "Robot phục vụ 'made in Vietnam' gây sốt tại các quán cà phê Sài Gòn", summary: "Chú robot này có thể tự động mang đồ uống tới bàn, nói lời cảm ơn và thậm chí biết tránh vật cản một cách khéo léo.", category: "Công Nghệ", image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80", author: "Tech Review", date: "08/11/2024", views: 3200, content: "Được phát triển bởi một startup công nghệ Việt, robot phục vụ có tên 'Mika' đang trở thành nhân viên đắc lực tại nhiều quán cà phê lớn. Mika có thể hoạt động liên tục 10 tiếng sau một lần sạc, di chuyển linh hoạt nhờ hệ thống camera 3D và cảm biến Lidar giúp tránh va chạm với khách hàng.\n\nSự xuất hiện của robot không thay thế hoàn toàn con người mà giúp nhân viên đỡ vất vả hơn trong việc bưng bê nặng nhọc, cho phép họ tập trung vào việc chăm sóc và trò chuyện với khách hàng. Nhiều thực khách, đặc biệt là trẻ em, tỏ ra vô cùng thích thú khi được 'nhân viên đặc biệt' này phục vụ. Đây là tín hiệu vui cho thấy năng lực làm chủ công nghệ robot của kỹ sư Việt Nam." },
  // --- VĂN HÓA ---
  { id: 9, title: "Giữ gìn hồn quê qua những làng nghề gốm sứ trăm năm tuổi", summary: "Những nghệ nhân trẻ đang thổi làn gió mới vào các sản phẩm gốm truyền thống, đưa văn hóa Việt ra thế giới.", category: "Văn Hóa", image: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=800&q=80", author: "Di Sản Việt", date: "15/11/2024", views: 2100, content: "Làng gốm Bát Tràng (Hà Nội) hay gốm Bàu Trúc (Ninh Thuận) không chỉ là nơi sản xuất mà còn là bảo tàng sống lưu giữ hồn cốt dân tộc. Điều đáng mừng là thế hệ trẻ con em làng nghề, sau khi đi học thiết kế bài bản ở nước ngoài, đã trở về và kết hợp kỹ thuật truyền thống với tư duy thẩm mỹ hiện đại.\n\nNhững sản phẩm gốm giờ đây không chỉ là bát đĩa, lư hương mà còn là những tác phẩm nghệ thuật sắp đặt, trang sức gốm tinh xảo được xuất khẩu sang Châu Âu, Nhật Bản. Họ đang kể câu chuyện văn hóa Việt Nam qua ngôn ngữ của đất nung và lửa, chứng minh rằng truyền thống không hề cũ kỹ nếu biết cách đổi mới và sáng tạo." },
  { id: 17, title: "Gìn giữ nghệ thuật múa rối nước: Niềm đam mê của những nghệ nhân trẻ tuổi", summary: "Vượt qua khó khăn, những người trẻ vẫn miệt mài thổi hồn vào những con rối vô tri, giữ lửa bộ môn nghệ thuật độc đáo chỉ có ở Việt Nam.", category: "Văn Hóa", image: "https://images.unsplash.com/photo-1583225214464-9296bd0790fa?auto=format&fit=crop&w=800&q=80", author: "Văn Hóa Việt", date: "07/11/2024", views: 1800, content: "Múa rối nước ra đời từ nền văn minh lúa nước sông Hồng, là báu vật văn hóa phi vật thể của nhân loại. Tuy nhiên, nghề múa rối đòi hỏi sự khổ luyện và sức khỏe dẻo dai khi phải ngâm mình dưới nước hàng giờ đồng hồ, khiến nhiều người trẻ e ngại.\n\nTại phường rối Đào Thục, vẫn có những bạn trẻ 9x, 10x ngày ngày tập luyện điều khiển con rối gỗ nặng cả chục cân. 'Khi thấy khán giả quốc tế ồ lên kinh ngạc và vỗ tay không ngớt, bao mệt mỏi tan biến hết. Mình muốn thế giới biết Việt Nam có một loại hình nghệ thuật tuyệt vời đến thế', một nghệ nhân trẻ tâm sự. Họ đang nỗ lực đưa các tích trò cổ tích lên sân khấu hiện đại, kết hợp âm thanh ánh sáng để thu hút khán giả trẻ." },
  { id: 10, title: "Văn hóa đọc thời đại số: Khi sách giấy và Ebook cùng tồn tại", summary: "Thói quen đọc sách của người trẻ đang thay đổi tích cực nhờ sự hỗ trợ của công nghệ và các cộng đồng yêu sách.", category: "Văn Hóa", image: "https://images.unsplash.com/photo-1491841550275-ad7854e35ca6?auto=format&fit=crop&w=800&q=80", author: "Mọt Sách", date: "14/11/2024", views: 1750, content: "Nhiều người lo ngại internet sẽ 'giết chết' văn hóa đọc, nhưng thực tế đang chứng minh điều ngược lại. Các nền tảng sách nói (Audiobook), sách điện tử (Ebook) đang giúp những người bận rộn tiếp cận tri thức mọi lúc mọi nơi. Đồng thời, sách giấy vẫn giữ được vị thế riêng với những ấn bản bìa cứng đẹp mắt, trở thành vật sưu tầm giá trị.\n\nCác cộng đồng review sách trên TikTok (BookTok), Facebook đang phát triển mạnh mẽ, tạo nên trào lưu đọc sách trong giới trẻ. Những hội chợ sách chật kín người tham dự là minh chứng rõ nhất cho thấy tình yêu với con chữ chưa bao giờ tắt. Văn hóa đọc chỉ đang chuyển mình để phù hợp với nhịp sống số, chứ không hề mất đi giá trị cốt lõi của nó." },
];

// --- KHỞI TẠO DỮ LIỆU ---
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

// Tạo Admin mặc định
if (!fs.existsSync(USERS_FILE)) {
    (async () => {
        const hashedPassword = await bcrypt.hash("Admin@123", 12);
        const adminUser = [{
            id: "admin001", name: "Administrator", email: "admin@newsdaily.com", 
            password: hashedPassword, isVerified: true, role: "admin", 
            avatar: "https://ui-avatars.com/api/?name=Admin+User&background=0D8ABC&color=fff"
        }];
        await fsPromises.writeFile(USERS_FILE, JSON.stringify(adminUser, null, 2));
    })();
} else {
    (async () => {
        try {
            const data = await fsPromises.readFile(USERS_FILE, 'utf8');
            let users = JSON.parse(data || '[]');
            if (!users.find(u => u.role === 'admin')) {
                const hashedPassword = await bcrypt.hash("Admin@123", 12);
                const adminUser = {
                    id: "admin001", name: "Administrator", email: "admin@newsdaily.com", 
                    password: hashedPassword, isVerified: true, role: "admin", 
                    avatar: "https://ui-avatars.com/api/?name=Admin+User&background=0D8ABC&color=fff"
                };
                users.push(adminUser);
                await fsPromises.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
                console.log("👉 Đã bổ sung tài khoản Admin vào danh sách user cũ.");
            }
        } catch (e) { console.log("Lỗi check admin:", e); }
    })();
}

// Tạo file bài viết nếu chưa có HOẶC file rỗng
if (!fs.existsSync(POSTS_FILE) || fs.readFileSync(POSTS_FILE, 'utf8').length < 10) {
    fs.writeFileSync(POSTS_FILE, JSON.stringify(SAMPLE_POSTS, null, 2));
    console.log("✅ Đã nạp 18 bài viết mẫu vào Database");
}

// --- CẤU HÌNH ---
const JWT_SECRET = process.env.JWT_SECRET || "Mat_Khau_Bi_Mat_Tam_Thoi_123"; 

// --- MIDDLEWARE ---
app.use(helmet());
app.use(cors()); 
app.use(express.json({ limit: '50mb' })); 

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: "Chưa đăng nhập" });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: "Token lỗi" });
        req.user = user; next();
    });
};

const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Không có quyền Admin" });
    next();
};

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api', limiter);

// --- UTILS ---
const readFile = async (file) => JSON.parse(await fsPromises.readFile(file, 'utf8').catch(() => '[]'));
const writeFile = async (file, data) => await fsPromises.writeFile(file, JSON.stringify(data, null, 2));
const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } });

const sendOTP = async (email, otp) => {
    try {
        if (!process.env.EMAIL_USER) throw new Error("Chưa cấu hình mail");
        await transporter.sendMail({ from: '"NewsDaily" <noreply@newsdaily.com>', to: email, subject: 'Mã OTP', text: `OTP: ${otp}` });
        return { success: true };
    } catch (e) { console.log("Dev OTP:", otp); return { success: false, otp: otp }; }
};

// --- ROUTES ---

// === SECURITY CODE & PROFILE ===
app.put('/api/user/security-code', authenticateToken, async (req, res) => {
    try {
        const { securityCode } = req.body;
        if (!securityCode || securityCode.length < 4) return res.status(400).json({ message: "Mã bảo vệ phải từ 4 ký tự trở lên" });
        const users = await readFile(USERS_FILE); const index = users.findIndex(u => u.id === req.user.id);
        if (index === -1) return res.status(404).json({ message: "User không tồn tại" });
        users[index].securityCode = await bcrypt.hash(securityCode, 10);
        await writeFile(USERS_FILE, users); res.json({ message: "Đã thiết lập mã bảo vệ thành công!" });
    } catch { res.status(500).json({ message: "Lỗi Server" }); }
});

app.post('/api/user/verify-security', authenticateToken, async (req, res) => {
    try {
        const { securityCode } = req.body;
        const users = await readFile(USERS_FILE);
        const user = users.find(u => u.id === req.user.id);
        if (!user.securityCode) return res.status(400).json({ message: "Bạn chưa thiết lập mã bảo vệ" });
        const isMatch = await bcrypt.compare(securityCode, user.securityCode);
        if (!isMatch) return res.status(400).json({ message: "Mã bảo vệ không đúng" });
        res.json({ message: "Xác thực thành công" });
    } catch { res.status(500).json({ message: "Lỗi Server" }); }
});

app.put('/api/user/update-profile', authenticateToken, async (req, res) => {
    try {
        const { name, phone, address, dob, gender, avatar } = req.body; // <-- Thêm avatar
        const users = await readFile(USERS_FILE);
        const index = users.findIndex(u => u.id === req.user.id);
        if (index === -1) return res.status(404).json({ message: "User không tồn tại" });
        if(name) users[index].name = name; if(phone) users[index].phone = phone;
        if(address) users[index].address = address; if(dob) users[index].dob = dob;
        if(gender) users[index].gender = gender;
        if(avatar) users[index].avatar = avatar; // <-- Lưu avatar
        await writeFile(USERS_FILE, users);
        const { password, otp, securityCode, ...updatedUser } = users[index];
        updatedUser.hasSecurityCode = !!users[index].securityCode;
        res.json({ message: "Cập nhật hồ sơ thành công!", user: updatedUser });
    } catch { res.status(500).json({ message: "Lỗi Server" }); }
});

// 1. POSTS CRUD
app.get('/api/posts', async (req, res) => { const posts = await readFile(POSTS_FILE); res.json(posts.reverse()); });
app.get('/api/posts/:id', async (req, res) => { const posts = await readFile(POSTS_FILE); const p = posts.find(x => x.id == req.params.id); p ? res.json(p) : res.status(404).json({message: "Not found"}); });
app.post('/api/posts', authenticateToken, requireAdmin, async (req, res) => {
    try { const newPost = { ...req.body, id: Date.now(), author: req.user.name || "Admin", date: new Date().toLocaleDateString('vi-VN'), views: 0 }; const posts = await readFile(POSTS_FILE); posts.push(newPost); await writeFile(POSTS_FILE, posts); res.json({ message: "Đã thêm!", post: newPost }); } catch { res.status(500).json({ message: "Lỗi" }); }
});
app.put('/api/posts/:id', authenticateToken, requireAdmin, async (req, res) => {
    try { const posts = await readFile(POSTS_FILE); const idx = posts.findIndex(x => x.id == req.params.id); if (idx === -1) return res.status(404).json({message: "Not found"}); posts[idx] = { ...posts[idx], ...req.body }; await writeFile(POSTS_FILE, posts); res.json({ message: "Đã cập nhật!" }); } catch { res.status(500).json({ message: "Lỗi" }); }
});
app.delete('/api/posts/:id', authenticateToken, requireAdmin, async (req, res) => {
    try { let posts = await readFile(POSTS_FILE); posts = posts.filter(x => x.id != req.params.id); await writeFile(POSTS_FILE, posts); res.json({ message: "Đã xóa!" }); } catch { res.status(500).json({ message: "Lỗi" }); }
});

// 2. USERS CRUD
app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => { const users = await readFile(USERS_FILE); res.json(users.map(({ password, otp, securityCode, ...u }) => u)); });
app.post('/api/users', authenticateToken, requireAdmin, async (req, res) => { try { const { name, email, password, role, phone, address, dob, gender } = req.body; const users = await readFile(USERS_FILE); if (users.find(u => u.email === email)) return res.status(400).json({ message: "Email tồn tại" }); const hashedPassword = await bcrypt.hash(password, 12); const newUser = { id: Date.now().toString(), name, email, password: hashedPassword, role: role || "user", phone, address, dob, gender, isVerified: true, avatar: `https://ui-avatars.com/api/?name=${name}` }; users.push(newUser); await writeFile(USERS_FILE, users); res.json({ message: "Đã thêm User!" }); } catch { res.status(500).json({ message: "Lỗi" }); } });
app.put('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => { try { const users = await readFile(USERS_FILE); const idx = users.findIndex(u => u.id == req.params.id); if (idx === -1) return res.status(404).json({ message: "Not found" }); const { name, role, phone, address, dob, gender } = req.body; users[idx] = { ...users[idx], name, role, phone, address, dob, gender }; await writeFile(USERS_FILE, users); res.json({ message: "Đã cập nhật!" }); } catch { res.status(500).json({ message: "Lỗi" }); } });
app.delete('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => { if (req.user.id == req.params.id) return res.status(400).json({ message: "Không thể xóa chính mình" }); let users = await readFile(USERS_FILE); users = users.filter(u => u.id != req.params.id); await writeFile(USERS_FILE, users); res.json({ message: "Đã xóa!" }); });

// 3. AUTH (CẬP NHẬT: AVATAR TRONG REGISTER)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone, address, dob, gender, avatar } = req.body; // <-- Thêm avatar
    if (password && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{8,})/.test(password)) return res.status(400).json({ message: "Mật khẩu yếu!" });
    
    const users = await readFile(USERS_FILE); let user = users.find(u => u.email === email);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    if (user) {
        if (user.isVerified) return res.status(400).json({ message: "Email đã tồn tại" });
        user.otp = otp; user.otpExpires = Date.now() + 600000;
        if (password) user.password = await bcrypt.hash(password, 12);
        if (name) user.name = name;
        if (phone) user.phone = phone; if (address) user.address = address; if (dob) user.dob = dob; if (gender) user.gender = gender;
        if (avatar) user.avatar = avatar;
    } else {
        const hashedPassword = await bcrypt.hash(password, 12);
        user = { 
            id: Date.now().toString(), name, email, password: hashedPassword, 
            phone, address, dob, gender, 
            otp, otpExpires: Date.now() + 600000, isVerified: false, role: "user", 
            avatar: avatar || `https://ui-avatars.com/api/?name=${name}` 
        };
        users.push(user);
    }
    await writeFile(USERS_FILE, users);
    const r = await sendOTP(email, otp); res.json(r.success ? { message: "OTP đã gửi" } : { message: `Lỗi mail. OTP: ${otp}`, devOtp: otp });
  } catch { res.status(500).json({ message: "Lỗi Server" }); }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body; const users = await readFile(USERS_FILE); const u = users.find(x => x.email === email);
        if (!u) return res.status(400).json({ message: "Email chưa đăng ký" });
        if (!u.isVerified) return res.status(400).json({ message: "Tài khoản chưa xác thực" });
        const isMatch = await bcrypt.compare(password, u.password);
        if (!isMatch) return res.status(400).json({ message: "Sai mật khẩu" });
        const userData = { id: u.id, name: u.name, email: u.email, avatar: u.avatar, role: u.role, phone: u.phone, address: u.address, dob: u.dob, gender: u.gender, hasSecurityCode: !!u.securityCode };
        const token = jwt.sign({id: u.id, role: u.role}, JWT_SECRET, {expiresIn:'24h'});
        res.json({token, user: userData});
    } catch (err) { res.status(500).json({ message: "Lỗi Server" }); }
});

app.post('/api/auth/verify-otp', async (req, res) => { const {email,otp} = req.body; const users = await readFile(USERS_FILE); const u = users.find(x=>x.email===email); if(!u || u.otp !== otp) return res.status(400).json({message:"OTP sai"}); u.isVerified=true; u.otp=undefined; await writeFile(USERS_FILE, users); res.json({message:"OK"}); });
app.post('/api/auth/check-otp', async (req, res) => { const {email,otp} = req.body; const users = await readFile(USERS_FILE); const u = users.find(x=>x.email===email); if(!u || u.otp !== otp) return res.status(400).json({message:"OTP sai"}); res.json({message:"OK"}); });
app.post('/api/auth/forgot-password', async (req, res) => { const {email} = req.body; const users = await readFile(USERS_FILE); const u = users.find(x=>x.email===email); if(!u) return res.status(404).json({message:"Email không tồn tại"}); const otp = Math.floor(100000 + Math.random() * 900000).toString(); u.otp=otp; u.otpExpires=Date.now()+600000; await writeFile(USERS_FILE, users); const r = await sendOTP(email, otp); res.json(r.success?{message:"Đã gửi OTP"}:{message:`Lỗi mail. OTP: ${otp}`, devOtp:otp}); });
app.post('/api/auth/reset-password', async (req, res) => { const {email, otp, newPassword} = req.body; if(!/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{8,})/.test(newPassword)) return res.status(400).json({message:"Pass yếu"}); const users = await readFile(USERS_FILE); const u = users.find(x=>x.email===email); if(!u || u.otp!==otp) return res.status(400).json({message:"OTP sai"}); u.password = await bcrypt.hash(newPassword, 12); u.otp=undefined; await writeFile(USERS_FILE, users); res.json({message:"OK"}); });
app.post('/api/user/request-otp', authenticateToken, async (req, res) => { const users = await readFile(USERS_FILE); const u = users.find(x=>x.id===req.user.id); const otp = Math.floor(100000 + Math.random() * 900000).toString(); u.otp=otp; await writeFile(USERS_FILE, users); const r = await sendOTP(u.email, otp); res.json(r.success?{message:"OTP đã gửi"}:{message:`Lỗi mail. OTP: ${otp}`, devOtp:otp}); });
app.put('/api/user/change-password-otp', authenticateToken, async (req, res) => { const {otp, newPassword} = req.body; if(!/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{8,})/.test(newPassword)) return res.status(400).json({message:"Pass yếu"}); const users = await readFile(USERS_FILE); const u = users.find(x=>x.id===req.user.id); if(!u || u.otp!==otp) return res.status(400).json({message:"OTP sai"}); u.password = await bcrypt.hash(newPassword, 12); u.otp=undefined; await writeFile(USERS_FILE, users); res.json({message:"OK"}); });

app.listen(PORT, () => console.log(`✅ Server Full Features + Avatar Upload running on ${PORT}`));