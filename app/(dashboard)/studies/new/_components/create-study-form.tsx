'use client'

import type { SyntheticEvent } from 'react'
import { startTransition, useState } from 'react'

import { useRouter } from 'next/navigation'

import { zodResolver } from '@hookform/resolvers/zod'
import { useFieldArray, useForm } from 'react-hook-form'
import { toast } from 'react-hot-toast'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { createStudy } from '@/lib/actions/studies'
import { cn } from '@/lib/utils/cn'
import {
  CreateStudySchema,
  type CreateStudyFormValues,
  type CreateStudyInput,
} from '@/lib/validations/study.schema'

const DEFAULT_STEPS = ['basics', 'sites', 'team'] as const

type CreateStudyFormProps = {
  className?: string
}

function getFieldArrayIndex(index: number): `${number}` {
  return String(index) as `${number}`
}

/** Guides study setup across protocol basics, site rollout, and team assignment. */
export function CreateStudyForm({ className }: CreateStudyFormProps) {
  const router = useRouter()
  const [activeStep, setActiveStep] = useState<(typeof DEFAULT_STEPS)[number]>('basics')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<CreateStudyFormValues, undefined, CreateStudyInput>({
    resolver: zodResolver(CreateStudySchema),
    defaultValues: {
      title: '',
      protocolNumber: '',
      phase: 'Phase II',
      description: '',
      therapeuticArea: '',
      targetEnrollment: 120,
      startDate: '',
      endDate: '',
      sites: [{ name: '', siteCode: '', country: '' }],
      teamAssignments: [],
    },
  })

  const sitesFieldArray = useFieldArray({
    control: form.control,
    name: 'sites',
  })

  const teamFieldArray = useFieldArray({
    control: form.control,
    name: 'teamAssignments',
  })

  async function goToStep(step: (typeof DEFAULT_STEPS)[number]) {
    const fieldsPerStep: Record<(typeof DEFAULT_STEPS)[number], (keyof CreateStudyFormValues)[]> = {
      basics: ['title', 'protocolNumber', 'phase', 'targetEnrollment', 'startDate', 'endDate'],
      sites: ['sites'],
      team: ['teamAssignments'],
    }

    const isValid = await form.trigger(fieldsPerStep[activeStep])
    if (!isValid && step !== activeStep) return

    setActiveStep(step)
  }

  function onSubmit(values: CreateStudyInput) {
    setIsSubmitting(true)

    startTransition(async () => {
      const result = await createStudy(values)
      setIsSubmitting(false)

      if (!result.success) {
        if (typeof result.error === 'object') {
          Object.entries(result.error).forEach(([field, errors]) => {
            form.setError(field as keyof CreateStudyInput, {
              message: errors[0] ?? 'Invalid value',
            })
          })
          toast.error('Fix the highlighted study configuration issues.')
          return
        }

        toast.error(result.error)
        return
      }

      toast.success('Study created successfully.')
      router.push(`/studies/${result.data.id}`)
      router.refresh()
    })
  }

  function handleFormSubmit(event: SyntheticEvent<HTMLFormElement>) {
    void form.handleSubmit(onSubmit)(event)
  }

  return (
    <Form {...form}>
      <form className={cn('space-y-6', className)} onSubmit={handleFormSubmit} noValidate>
        <Tabs
          value={activeStep}
          onValueChange={(value) => void goToStep(value as (typeof DEFAULT_STEPS)[number])}
        >
          <TabsList>
            <TabsTrigger value="basics">1. Basics</TabsTrigger>
            <TabsTrigger value="sites">2. Sites</TabsTrigger>
            <TabsTrigger value="team">3. Team</TabsTrigger>
          </TabsList>

          <TabsContent value="basics">
            <Card>
              <CardHeader>
                <CardTitle>Study fundamentals</CardTitle>
                <CardDescription>
                  Define the protocol core, therapeutic area, enrollment target, and timeline.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Study title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="A Phase II study of adaptive immunotherapy..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="protocolNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Protocol number</FormLabel>
                      <FormControl>
                        <Input placeholder="CDH-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phase"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phase</FormLabel>
                      <FormControl>
                        <select
                          className="flex h-11 w-full rounded-xl border border-[color:var(--color-gray-200)] bg-white px-3 py-2 text-sm text-[color:var(--color-gray-900)] shadow-sm outline-none focus:border-[color:var(--color-navy-700)] focus:ring-2 focus:ring-[color:var(--color-navy-100)]"
                          {...field}
                        >
                          <option value="Phase I">Phase I</option>
                          <option value="Phase II">Phase II</option>
                          <option value="Phase III">Phase III</option>
                          <option value="Phase IV">Phase IV</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="therapeuticArea"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Therapeutic area</FormLabel>
                      <FormControl>
                        <Input placeholder="Oncology" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="targetEnrollment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target enrollment</FormLabel>
                      <FormControl>
                        <Input
                          min={1}
                          name={field.name}
                          placeholder="120"
                          ref={field.ref}
                          type="number"
                          value={typeof field.value === 'number' ? field.value : ''}
                          onBlur={field.onBlur}
                          onChange={(event) => {
                            field.onChange(
                              event.target.value === '' ? undefined : Number(event.target.value),
                            )
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Total planned subject enrollment across all sites.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Planned start date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Planned end date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Study description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Summarize the clinical objective, population, and endpoints."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sites">
            <Card>
              <CardHeader>
                <CardTitle>Site rollout plan</CardTitle>
                <CardDescription>
                  Capture participating sites before user assignment and enrollment workflows begin.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {sitesFieldArray.fields.map((site, index) => {
                  const siteIndex = getFieldArrayIndex(index)

                  return (
                    <div
                      key={site.id}
                      className="grid gap-4 rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] p-4 md:grid-cols-3"
                    >
                      <FormField
                        control={form.control}
                        name={`sites.${siteIndex}.name` as const}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Site name</FormLabel>
                            <FormControl>
                              <Input placeholder="City Clinical Research Center" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`sites.${siteIndex}.siteCode` as const}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Site code</FormLabel>
                            <FormControl>
                              <Input placeholder="SITE-001" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`sites.${siteIndex}.country` as const}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country</FormLabel>
                            <FormControl>
                              <Input placeholder="India" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="md:col-span-3">
                        <Button
                          disabled={sitesFieldArray.fields.length === 1}
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            sitesFieldArray.remove(index)
                          }}
                        >
                          Remove site
                        </Button>
                      </div>
                    </div>
                  )
                })}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    sitesFieldArray.append({ name: '', siteCode: '', country: '' })
                  }}
                >
                  Add site
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team">
            <Card>
              <CardHeader>
                <CardTitle>Team assignments</CardTitle>
                <CardDescription>
                  Map users to sites by their profile ids. This keeps the initial workflow
                  compatible with RLS-based site access.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {teamFieldArray.fields.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] px-4 py-6 text-sm text-[color:var(--color-gray-600)]">
                    No site users added yet. You can create the study now or assign users before
                    launch.
                  </p>
                ) : null}

                {teamFieldArray.fields.map((assignment, index) => {
                  const assignmentIndex = getFieldArrayIndex(index)

                  return (
                    <div
                      key={assignment.id}
                      className="grid gap-4 rounded-2xl border border-[color:var(--color-gray-200)] bg-[color:var(--color-gray-50)] p-4 md:grid-cols-3"
                    >
                      <FormField
                        control={form.control}
                        name={`teamAssignments.${assignmentIndex}.userId` as const}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>User id</FormLabel>
                            <FormControl>
                              <Input placeholder="Supabase profile UUID" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`teamAssignments.${assignmentIndex}.role` as const}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Role</FormLabel>
                            <FormControl>
                              <select
                                className="flex h-11 w-full rounded-xl border border-[color:var(--color-gray-200)] bg-white px-3 py-2 text-sm text-[color:var(--color-gray-900)] shadow-sm outline-none focus:border-[color:var(--color-navy-700)] focus:ring-2 focus:ring-[color:var(--color-navy-100)]"
                                {...field}
                              >
                                <option value="investigator">Investigator</option>
                                <option value="coordinator">Coordinator</option>
                                <option value="monitor">Monitor</option>
                                <option value="data_manager">Data manager</option>
                                <option value="read_only">Read only</option>
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`teamAssignments.${assignmentIndex}.siteCode` as const}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Assigned site code</FormLabel>
                            <FormControl>
                              <Input placeholder="SITE-001" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="md:col-span-3">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            teamFieldArray.remove(index)
                          }}
                        >
                          Remove assignment
                        </Button>
                      </div>
                    </div>
                  )
                })}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    teamFieldArray.append({ userId: '', role: 'coordinator', siteCode: '' })
                  }}
                >
                  Add assignment
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex flex-wrap justify-between gap-3">
          <div className="flex gap-3">
            <Button
              disabled={activeStep === 'basics'}
              type="button"
              variant="outline"
              onClick={() => {
                const index = DEFAULT_STEPS.indexOf(activeStep)
                const nextStep = DEFAULT_STEPS[Math.max(index - 1, 0)]
                if (nextStep) {
                  setActiveStep(nextStep)
                }
              }}
            >
              Previous
            </Button>
            <Button
              disabled={activeStep === 'team'}
              type="button"
              variant="outline"
              onClick={() => {
                const index = DEFAULT_STEPS.indexOf(activeStep)
                const nextStep = DEFAULT_STEPS[Math.min(index + 1, DEFAULT_STEPS.length - 1)]
                if (nextStep) {
                  void goToStep(nextStep)
                }
              }}
            >
              Next
            </Button>
          </div>
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Creating study...' : 'Create study'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
