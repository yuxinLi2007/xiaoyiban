Page({
  data: { deptName:'', doctorName:'', statusText:'已完成', hospitalName:'', visitTime:'', summaryText:'', transcriptText:'' },
  onLoad(options) {
    this.setData({
      deptName: options.dept || '未知科室', doctorName: options.doctor || '未知医生',
      hospitalName: options.hospital || '未知医院', visitTime: options.time || '',
      summaryText: '患者血压控制良好，建议继续服用降压药，低盐饮食，每月复查一次。',
      transcriptText: '医生：最近血压怎么样？\n患者：早上量是130/85。\n医生：还不错，药要按时吃...'
    });
  }
});
