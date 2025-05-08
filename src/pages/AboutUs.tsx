import React from 'react';

function AboutUs() {
  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-center mb-12">About Us</h1>
      <div className="max-w-3xl mx-auto text-lg leading-relaxed space-y-6 text-gray-300">
        <p className="italic">
          Welcome to Vignan University's official Lost & Found Portal, your trusted platform for reporting and
          recovering lost items within our campus. We understand how stressful it can be to misplace something
          important – whether it's an ID card, a project file, a pair of earphones, or any other personal belonging.
        </p>
        <p>
          That's why we've created this portal to help students, faculty, and staff come together and support one
          another. Our mission is to make it easier for you to report found items and search for lost ones in a
          centralized, accessible space. By fostering a spirit of community and cooperation, we aim to reunite lost
          belongings with their rightful owners quickly and efficiently. Together, let's build a more responsible and
          caring campus environment at Vignan University.
        </p>
      </div>
      <div className="text-center mt-12 text-sm text-gray-500">
        <p>Copyright © 2025</p>
        <p>Designed and Built by Team Survivals</p>
      </div>
    </div>
  );
}

export default AboutUs;