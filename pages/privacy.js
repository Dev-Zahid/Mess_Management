export default function Privacy() {
  return (
    <div className="container" style={{ padding: '60px 24px', maxWidth: 720 }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 20 }}>প্রাইভেসি পলিসি</h1>
      <div style={{ color: 'var(--mu)', fontSize: 14, lineHeight: 1.8 }}>
        <p style={{ marginBottom: 14 }}>এই পেজে আপনি কী ডেটা সংগ্রহ করেন (নাম, ফোন, টেনেন্ট তথ্য, পেমেন্ট রেকর্ড), কীভাবে সংরক্ষণ করেন
        এবং কার সাথে শেয়ার করেন (কারো সাথে না — এটাই মূল প্রতিশ্রুতি হওয়া উচিত) তা স্পষ্টভাবে লিখুন। এটি একটি প্লেসহোল্ডার — লঞ্চের
        আগে চূড়ান্ত করে নিন।</p>
        <p style={{ marginBottom: 14 }}><b>আমরা যা সংগ্রহ করি:</b> মেসের নাম, মালিকের নাম ও ফোন নম্বর, টেনেন্ট তথ্য, ভাড়া/পেমেন্ট রেকর্ড।</p>
        <p style={{ marginBottom: 14 }}><b>আমরা যা করি না:</b> আপনার বা আপনার টেনেন্টদের ডেটা কোনো তৃতীয় পক্ষের কাছে বিক্রি বা শেয়ার করি না।</p>
      </div>
    </div>
  );
}
