import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateProfile } from '@/services/api/profile'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { SkillLevelPicker } from './SkillLevelPicker'

export interface MissingField {
  field: string
  label: string
  scope: string
}

interface ProfileCompletionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  missingFields: MissingField[]
  onSuccess: () => void
}

export function ProfileCompletionModal({ open, onOpenChange, missingFields, onSuccess }: ProfileCompletionModalProps) {
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState<Record<string, any>>({})

  const mutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-status'] })
      onSuccess()
    },
  })

  const handleSave = () => {
    mutation.mutate(formData)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-white/10">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Complete Your Profile</DialogTitle>
        </DialogHeader>
        <p className="text-gray-400 mb-6">Please fill in the following details to continue.</p>
        <div className="space-y-6">
          {missingFields.map((field) => (
            <div key={field.field}>
              <Label className="mb-2 block">
                {field.field === 'contact_number' ? 'Phone Number' : field.label}
              </Label>
              {field.field === 'contact_number' ? (
                <Input
                  type="tel"
                  value={formData.contact_number ?? ''}
                  onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                  placeholder="+972..."
                  className="mt-2"
                />
              ) : field.field === 'skill_level' ? (
                <div className="mt-2">
                  <SkillLevelPicker
                    value={formData.skill_level}
                    onChange={(val) => setFormData({ ...formData, skill_level: val })}
                  />
                </div>
              ) : null}
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} disabled={mutation.isPending} className="flex-1 bg-electric-green text-slate-950 hover:bg-electric-green/90">
            {mutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}