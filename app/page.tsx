"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { HeroSectionCard } from "@/components/homepage/editable-cards/hero-section-card"
import { AboutUsCard } from "@/components/homepage/editable-cards/about-us-card"
import { ContactUsCard } from "@/components/homepage/editable-cards/contact-us-card"
import { FAQCard } from "@/components/homepage/editable-cards/faq-card"
import { OurServicesCard } from "@/components/homepage/editable-cards/our-services-card"
import { OurTeamCard } from "@/components/homepage/editable-cards/our-team-card"
import axios from "axios"
import domain from "@/components/utils/domain"
import { toast } from "react-toastify"

// Define interfaces for all our data structures
interface HeroDetail {
  title: string;
  description: string;
  image: string;
  buttonText: string;
  buttonLink: string;
}

interface HeroSectionData {
  clientId: string;
  details: HeroDetail[];
}

interface AboutPoint {
  title: string;
  description: string;
}

interface AboutUsData {
  clientId: string;
  subTitle: string;
  description: string;
  image: string;
  points: AboutPoint[];
}

interface ContactUsData {
  subTitle: string;
  address: string;
  phone1: string;
  phone2?: string;
  email1: string;
  email2?: string;
  mapLink: string;
}

interface FAQItem {
  title: string;
  description: string;
}

interface FAQData {
  clientId: string;
  subTitle: string;
  FAQs: FAQItem[];
}

interface Service {
  icon: string;
  title: string;
  description: string;
}

interface OurServicesData {
  clientId: string;
  subTitle: string;
  services: Service[];
}

interface TeamMember {
  name: string;
  position: string;
  image: string;
}

interface OurTeamData {
  clientId: string;
  subTitle: string;
  teamMembers: TeamMember[];
}

interface LoadingState {
  heroSection: boolean;
  aboutUs: boolean;
  ourServices: boolean;
  ourTeam: boolean;
  faq: boolean;
}

export default function Home() {
  const clientId = process.env.NEXT_PUBLIC_CLIENT_ID || ""

  // * Loading states
  const [loading, setLoading] = useState<LoadingState>({
    heroSection: true,
    aboutUs: true,
    ourServices: true,
    ourTeam: true,
    faq: true,
  })

  //* Initialize state with default values
  const [heroSection, setHeroSection] = useState<HeroSectionData>({
    clientId: clientId,
    details: [
      {
        title: "",
        description: "",
        image: "",
        buttonText: "",
        buttonLink: "",
      },
    ],
  })

  const [aboutUs, setAboutUs] = useState<AboutUsData>({
    clientId: clientId,
    subTitle: "",
    description: "",
    image: "",
    points: [
      {
        title: "",
        description: "",
      },
    ],
  })

  const [contactUs, setContactUs] = useState<ContactUsData>({
    subTitle: "Get in Touch",
    address: "123 Real Estate Ave, City, State 12345",
    phone1: "+1 (555) 123-4567",
    phone2: "",
    email1: "info@realestate.com",
    email2: "",
    mapLink:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3153.7462606519114!2d-122.41941548439737!3d37.77492977975903!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8085809c6c8f4459%3A0xb10ed6d9b5050fa5!2sTwitter!5e0!3m2!1sen!2sus!4v1626209282576!5m2!1sen!2sus",
  })

  const [ourServices, setOurServices] = useState<OurServicesData>({
    clientId: clientId,
    subTitle: "",
    services: [],
  })

  const [faq, setFAQ] = useState<FAQData>({
    clientId: clientId,
    subTitle: "",
    FAQs: [],
  })

  const [ourTeam, setOurTeam] = useState<OurTeamData>({
    clientId: clientId,
    subTitle: "",
    teamMembers: [],
  })

  // * Memoized axios instance
  const api = useMemo(() => axios.create({
    baseURL: domain,
    timeout: 15000,
  }), [])

  // !! Generic error handler
  const handleError = useCallback((error: unknown, context: string) => {
    console.error(`Error in ${context}:`, error)
    if (error instanceof Error) {
      toast.error(`Error in ${context}: ${error.message}`)
    } else {
      toast.error(`Unknown error in ${context}`)
    }
  }, [])

  // !! Generic loading state updater
  const updateLoadingState = useCallback((key: keyof LoadingState, value: boolean) => {
    setLoading(prev => ({ ...prev, [key]: value }))
  }, [])

  // !! Fetching functions with proper error handling and loading states
  const fetchHeroSection = useCallback(async () => {
    if (!clientId) return

    updateLoadingState('heroSection', true)
    try {
      const response = await api.get(`/api/hero-section?clientId=${clientId}`)
      if (response.data?.data) {
        setHeroSection(response.data.data)
      }
    } catch (error) {
      handleError(error, 'fetching hero section')
    } finally {
      updateLoadingState('heroSection', false)
    }
  }, [clientId, api, handleError, updateLoadingState])

  // !! Fetching About us section with proper error handling and loading states
  const fetchAboutUs = useCallback(async () => {
    if (!clientId) return

    updateLoadingState('aboutUs', true)
    try {
      const response = await api.get(`/api/about-us?clientId=${clientId}`)
      if (response.data?.data) {
        setAboutUs(response.data.data)
      }
    } catch (error) {
      handleError(error, 'fetching about us section')
    } finally {
      updateLoadingState('aboutUs', false)
    }
  }, [clientId, api, handleError, updateLoadingState])

  // !! Fetching Our Services section with proper error handling and loading states 
  const fetchOurServices = useCallback(async () => {
    if (!clientId) return

    updateLoadingState('ourServices', true)
    try {
      const response = await api.get(`/api/our-services?clientId=${clientId}`)
      if (response.data?.data) {
        setOurServices(response.data.data)
      }
    } catch (error) {
      handleError(error, 'fetching our services')
    } finally {
      updateLoadingState('ourServices', false)
    }
  }, [clientId, api, handleError, updateLoadingState])

  // !! Fetching Our Team section with proper error handling and loading states
  const fetchOurTeam = useCallback(async () => {
    if (!clientId) return

    updateLoadingState('ourTeam', true)
    try {
      const response = await api.get(`/api/our-team?clientId=${clientId}`)
      console.log('Raw API response:', response.data)

      if (response.data?.data) {
        const teamData = response.data.data

        // Check if data is an array (as shown in your console.log)
        if (Array.isArray(teamData) && teamData.length > 0) {
          // Take the first object from the array
          const firstTeamData = teamData[0]
          setOurTeam({
            clientId: firstTeamData.clientId,
            subTitle: firstTeamData.subTitle,
            teamMembers: firstTeamData.teamMembers || []
          })
        } else if (!Array.isArray(teamData)) {
          // If it's already an object (not an array)
          setOurTeam({
            clientId: teamData.clientId,
            subTitle: teamData.subTitle,
            teamMembers: teamData.teamMembers || []
          })
        } else {
          // Empty array or no data
          console.log('No team data found')
        }
      }
    } catch (error) {
      handleError(error, 'fetching our team')
    } finally {
      updateLoadingState('ourTeam', false)
    }
  }, [clientId, api, handleError, updateLoadingState])

  // !! Fetching FAQ section with proper error handling and loading states
  const fetchFAQ = useCallback(async () => {
    if (!clientId) return

    updateLoadingState('faq', true)
    try {
      const response = await api.get(`/api/FAQs?clientId=${clientId}`)
      if (response.data?.data) {
        setFAQ(response.data.data)
      }
    } catch (error) {
      handleError(error, 'fetching FAQ')
    } finally {
      updateLoadingState('faq', false)
    }
  }, [clientId, api, handleError, updateLoadingState])

  // !! Initial data fetch - only runs once when component mounts
  useEffect(() => {
    if (!clientId) return

    const fetchAllData = async () => {
      await Promise.allSettled([
        fetchHeroSection(),
        fetchAboutUs(),
        fetchOurServices(),
        fetchOurTeam(),
        fetchFAQ(),
      ])
    }

    fetchAllData()
  }, [clientId, fetchHeroSection, fetchAboutUs, fetchOurServices, fetchOurTeam, fetchFAQ])

  // !! function for saving Hero Section data with proper error handling and loading states
  const handleSaveHeroSection = useCallback(async (data: HeroSectionData) => {
    try {
      updateLoadingState('heroSection', true)

      // Try to get existing data first
      let response
      try {
        await api.get(`/api/hero-section?clientId=${clientId}`)
        // If successful, update
        response = await api.put('/api/hero-section', data)
      } catch {
        // If not found, create new
        response = await api.post('/api/hero-section', data)
      }

      if (response.status === 200 || response.status === 201) {
        setHeroSection(data)
        toast.success("Hero section saved successfully!")
        return response.data.data
      }
    } catch (error) {
      handleError(error, 'saving hero section')
      return null
    } finally {
      updateLoadingState('heroSection', false)
    }
  }, [clientId, api, handleError, updateLoadingState])

  // !! function for saving About Us section data with proper error handling and loading states
  const handleSaveAboutUs = useCallback(async (data: AboutUsData) => {
    // Validation
    if (!data.clientId || !data.subTitle || !data.description || !data.image || !Array.isArray(data.points) || data.points.length === 0) {
      toast.error("All fields are required")
      return null
    }

    for (const point of data.points) {
      if (!point.title || !point.description) {
        toast.error("All point fields are required")
        return null
      }
    }

    try {
      updateLoadingState('aboutUs', true)

      let response
      try {
        await api.get(`/api/about-us?clientId=${clientId}`)
        response = await api.put('/api/about-us', data)
      } catch {
        response = await api.post('/api/about-us', data)
      }

      if (response.status === 200 || response.status === 201) {
        setAboutUs(data)
        toast.success("About Us section saved successfully!")
        return response.data.data
      }
    } catch (error) {
      handleError(error, 'saving About Us section')
      return null
    } finally {
      updateLoadingState('aboutUs', false)
    }
  }, [clientId, api, handleError, updateLoadingState])

  // !! function for saving Our Services section data with proper error handling and loading states
  const handleSaveOurServices = useCallback(async (data: OurServicesData) => {
    try {
      updateLoadingState('ourServices', true)

      const checkResponse = await fetch(`${domain}/api/our-services?clientId=${data.clientId}`)
      const checkResult = await checkResponse.json()

      let response
      if (checkResponse.ok && checkResult.success) {
        const id = checkResult.data._id
        response = await fetch(`${domain}/api/our-services?id=${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
      } else {
        response = await fetch(`${domain}/api/our-services`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
      }

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.message || "Failed to save services data")
      }

      setOurServices(data)
      toast.success("Services updated successfully")
    } catch (error) {
      handleError(error, 'saving services')
    } finally {
      updateLoadingState('ourServices', false)
    }
  }, [handleError, updateLoadingState])

  // !! function for saving Our Team section data with proper error handling and loading states
  const handleSaveOurTeam = useCallback(async (data: OurTeamData) => {
    if (!data.subTitle.trim()) {
      toast.error("Subtitle is required")
      return
    }
    if (data.teamMembers.length === 0) {
      toast.error("At least one team member is required")
      return
    }
    if (data.teamMembers.some(member => !member.name.trim() || !member.position.trim() || !member.image)) {
      toast.error("All team members must have a name, position, and image")
      return
    }

    try {
      updateLoadingState('ourTeam', true)
      const checkResponse = await axios.get(`${domain}/api/our-team?clientId=${clientId}`)
      const checkResult = await checkResponse.data

      let response
      if (checkResponse && checkResult.success && checkResult.data.length > 0) {
        const id = checkResult.data[0]._id
        response = await fetch(`${domain}/api/our-team?id=${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
      } else {
        response = await axios.post(`${domain}/api/our-team`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
      }
      if (response.status !== 200 && response.status !== 201) {
        throw new Error("Failed to save team data")
      }

      setOurTeam(data)
      toast.success("Team data saved successfully")
    } catch (error) {
      handleError(error, 'saving team data')
    } finally {
      updateLoadingState('ourTeam', false)
    }
  }, [clientId, handleError, updateLoadingState])

  // !! function for saving FAQ section data with proper error handling and loading states
  const handleSaveFAQ = useCallback(async (data: FAQData) => {
    // Validation
    if (!data.subTitle.trim()) {
      toast.error("Subtitle is required")
      return
    }

    if (data.FAQs.length === 0) {
      toast.error("Please add at least one FAQ")
      return
    }

    if (data.FAQs.some((faq) => !faq.title.trim() || !faq.description.trim())) {
      toast.error("All FAQs must have a question and answer")
      return
    }

    try {
      updateLoadingState('faq', true)
      const checkResponse = await axios.get(`${domain}/api/FAQs?clientId=${data.clientId}`)
      const checkResult = await checkResponse.data

      let response
      if (checkResult && checkResult.success && checkResult.data) {
        const id = checkResult.data._id
        response = await axios.put(
          `${domain}/api/FAQs?id=${id}`,
          data,
          { headers: { "Content-Type": "application/json" } }
        )
      } else {
        response = await axios.post(`${domain}/api/faq`, {
          data,
          headers: { "Content-Type": "application/json" },
        })
      }

      if (response.status != 200 && response.status != 201) {
        throw new Error("Failed to save FAQ data")
      }

      setFAQ(data)
      toast.success("FAQ data saved successfully")
    } catch (error) {
      handleError(error, 'saving FAQ')
    } finally {
      updateLoadingState('faq', false)
    }
  }, [handleError, updateLoadingState])

  const handleSaveContactUs = useCallback((data: ContactUsData) => {
    setContactUs(data)
    toast.success("Contact Us information updated")
  }, [])


  return (
    <main className="container mx-auto p-4 py-8">
      <h1 className="mb-8 text-center text-3xl font-bold">Website Content Management</h1>

      <div className="grid gap-8">
        <HeroSectionCard
          clientId={heroSection.clientId}
          details={heroSection.details}
          onSave={handleSaveHeroSection}
          loading={loading.heroSection}
        />

        <AboutUsCard
          clientId={aboutUs.clientId}
          subTitle={aboutUs.subTitle}
          description={aboutUs.description}
          image={aboutUs.image}
          points={aboutUs.points}
          onSave={handleSaveAboutUs}
          loading={loading.aboutUs}
        />

        <OurServicesCard
          clientId={ourServices.clientId}
          subTitle={ourServices.subTitle}
          services={ourServices.services}
          onSave={handleSaveOurServices}
          loading={loading.ourServices}
        />

        <OurTeamCard
          clientId={clientId}
          subTitle={ourTeam.subTitle}
          teamMembers={ourTeam.teamMembers}
          onSave={handleSaveOurTeam}
          loading={loading.ourTeam}
        />

        <FAQCard
          clientId={faq.clientId}
          subTitle={faq.subTitle}
          FAQs={faq.FAQs}
          onSave={handleSaveFAQ}
          loading={loading.faq}
        />

        <ContactUsCard
          subTitle={contactUs.subTitle}
          address={contactUs.address}
          phone1={contactUs.phone1}
          phone2={contactUs.phone2}
          email1={contactUs.email1}
          email2={contactUs.email2}
          mapLink={contactUs.mapLink}
          onSave={handleSaveContactUs}
        />
      </div>
    </main>
  )
}