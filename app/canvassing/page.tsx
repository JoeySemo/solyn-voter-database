'use client'

import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Wand2 } from 'lucide-react'

export default function CanvassingPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-extrabold flex items-center gap-2">
            <Wand2 className="h-6 w-6" /> Canvassing Planner
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Planner coming online…</p>
          <div className="mt-4">
            <Button asChild>
              <a href="/voter-database">Go to Voter Database</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

 