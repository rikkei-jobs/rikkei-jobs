#!/usr/bin/env node

/**
 * Script giả lập hệ thống lms-pm gọi sang Rikkei Jobs phát đường link phiếu đánh giá.
 * Được thiết kế và sử dụng từ task TT-04.
 *
 * Cách chạy:
 *   node mock/send-evaluation-links.js <batchId>
 * Ví dụ:
 *   node mock/send-evaluation-links.js IOC-JB-2026-09
 */

const fs = require('fs');
const path = require('path');

const batchId = process.argv[2];

if (!batchId) {
  console.log('Usage: node mock/send-evaluation-links.js <batchId>');
  process.exit(1);
}

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';
const SERVICE_KEY = process.env.SERVICE_KEY || 'dev-key';
const DATA_FILE = path.join(__dirname, 'data.json');

async function main() {
  if (!fs.existsSync(DATA_FILE)) {
    console.error(`Lỗi: Không tìm thấy file dữ liệu tại ${DATA_FILE}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  const data = JSON.parse(raw);

  const matchedInterns = [];

  const internshipsMap = data.internships || {};
  for (const [lmsUserId, list] of Object.entries(internshipsMap)) {
    if (Array.isArray(list)) {
      const found = list.find(item => item.batchId === batchId);
      if (found) {
        matchedInterns.push({
          lmsUserId,
          batchId,
          mentorEmail: found.mentorEmail || 'mentor1@rikkeijobs.test',
          topicName: found.topicName || ''
        });
      }
    }
  }

  if (matchedInterns.length === 0) {
    console.log(`Không tìm thấy thực tập sinh nào thuộc đợt thực tập '${batchId}' trong data.json.`);
    return;
  }

  console.log(`Tìm thấy ${matchedInterns.length} thực tập sinh thuộc đợt '${batchId}'. Bắt đầu gửi yêu cầu tạo link đánh giá...`);

  const endpoint = `${BACKEND_URL}/api/v1/integrations/pm/evaluation-links`;

  for (const intern of matchedInterns) {
    const payload = {
      mentorEmail: intern.mentorEmail,
      lmsUserId: intern.lmsUserId,
      batchId: intern.batchId
    };

    try {
      console.log(`Gửi yêu cầu cho học viên ${intern.lmsUserId} (mentor: ${intern.mentorEmail})...`);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Key': SERVICE_KEY
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[Cảnh báo] Backend phản hồi HTTP ${response.status}: ${errorText}`);
        console.warn(`Lưu ý: Endpoint '${endpoint}' được thiết kế để sử dụng từ task TT-04.`);
        continue;
      }

      const result = await response.json();
      console.log(`[Thành công] Link đánh giá cho ${intern.lmsUserId}: ${result.evaluationLink || result.link || JSON.stringify(result)}`);
    } catch (err) {
      console.warn(`[Cảnh báo kết nối] Không thể kết nối tới Backend tại ${endpoint}.`);
      console.warn(`Lý do: ${err.message}`);
      console.warn('Backend chưa sẵn sàng hoặc endpoint chưa được hỗ trợ trong Sprint 1 (tính năng sẽ hoàn thiện ở task TT-04).');
    }
  }
}

main().catch(err => {
  console.error('Đã xảy ra lỗi không mong muốn:', err.message);
  process.exit(1);
});
