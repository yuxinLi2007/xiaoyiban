Page({
  data: {
    elders: [],
    selectedElderIdx: 0,
    diagnosis: '',
    doctor: '',
    hospital: '',
    advice: '',
    medicine: ''
  },

  onLoad() {
    const db = wx.cloud.database()
    db.collection('elders').where({}).get().then(res => {
      this.setData({ elders: res.data })
    })
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [field]: e.detail.value })
  },

  onElderChange(e) {
    this.setData({ selectedElderIdx: e.detail.value })
  },

  onSubmit() {
    const { diagnosis, doctor, hospital, advice, medicine, selectedElderIdx, elders } = this.data
    const elder = elders[selectedElderIdx]

    if (!elder) {
      wx.showToast({ title: '请选择老人', icon: 'none' })
      return
    }

    const fields = [
      { key: 'diagnosis', label: '诊断' },
      { key: 'doctor', label: '医生' },
      { key: 'hospital', label: '医院' }
    ]
    for (const f of fields) {
      if (!this.data[f.key].trim()) {
        wx.showToast({ title: `请输入${f.label}`, icon: 'none' })
        return
      }
    }

    const now = new Date()
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const data = {
      elderId: elder._id,
      familyId: elder.familyId || 'family_001',
      name: elder.name,
      diagnosis: diagnosis.trim(),
      doctor: doctor.trim(),
      hospital: hospital.trim(),
      advice: advice.trim(),
      medicine: medicine.trim(),
      date,
      isNew: true,
      source: 'child',
      createdAt: Date.now()
    }

    const db = wx.cloud.database()
    db.collection('records').add({ data }).then(res => {
      console.log('写入成功, _id:', res._id)
      wx.showToast({ title: '添加成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1500)
    }).catch(err => {
      console.error('添加失败', err)
      wx.showModal({
        title: '添加失败',
        content: `${err.errMsg || err.message || JSON.stringify(err)}`,
        showCancel: false
      })
    })
  }
})
